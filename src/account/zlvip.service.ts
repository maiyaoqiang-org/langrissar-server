import { Injectable } from '@nestjs/common';
import penc from './sdk/pd_encrypt.vs1.js'
import axios from 'axios';
import { LoggerService } from '../common/services/logger.service.js';
import { inspect } from 'util';


// 定义 CycleType 枚举
export enum CycleType {
    Weekly = 2,
    Monthly = 3
}

// 定义映射对象
export const CycleTypeDescription = {
    [CycleType.Weekly]: '每周',
    [CycleType.Monthly]: '每月'
};


// 定义 Gift 接口，将 cycleType 类型改为 CycleType 枚举
interface Gift {
    id: number;
    name: string;
    description: string;
    mainImage: string;
    cycleType: CycleType;
    type: number;
    status: number;
}

// 定义 User 类型
interface User {
    create: string;
    appkey: number;
    userid: number;
    device: string;
    token: string;
}

// 定义 Data 类型
export interface UserInfo {
    accountid: string;
    userlist: User[];
}

// 定义 LoginResponse 类型
interface LoginResponse {
    msg: string;
    data: UserInfo;
    status: number;
    info: number;
}

// 定义 CurrentUserDetail 类型
interface CurrentUserDetail {
    phone: string;
    availablePoints: number;
    validGrowth: number;
    signDays: number;
    currentLevel: number;
    levelExpire: string;
    totalPoints: number;
    birthday: string;
    maxGrowth: number;
    followService: number;
    redNot: boolean;
    accId: string;
}

export interface GameInfo {
    id: null;
    appId: string;
    appKey: number;
    name: string;
    itemIcons: string[];
    mainIcon: string;
    description: string;
    extInfo: null;
}


@Injectable()
export class ZlvipService {
    static mzAppKey = 1486458782785
    private readonly logger = LoggerService.getInstance();
    account: string;
    password: string;
    currentGameAppkey: number = 1486458782785
    userInfo: UserInfo;
    currentToken: string;
    currentUserDetail: CurrentUserDetail;

    get currentUser() {
        return this.userInfo?.userlist?.find(user => user.appkey === Number(this.currentGameAppkey))
    }
    private getRamNumber() {
        for (var e = "", t = 0; t < 40; t++)
            e += Math.floor(16 * Math.random()).toString(16);
        return e
    }
    constructor() { }

    setUserInfo(userInfo: UserInfo,appkey: number | null = ZlvipService.mzAppKey) {
        if (!appkey) {
            appkey = ZlvipService.mzAppKey
        }
        this.userInfo = userInfo;
        this.currentGameAppkey = appkey
    }
    async init(userInfo: UserInfo, appkey: number | null = ZlvipService.mzAppKey) {
        this.setUserInfo(userInfo,appkey)
        await this.accountLogin()
    }

    // async login({ account, password }: { account: string, password: string }) {
    //     this.account = account; // 替换为实际的账号
    //     this.password = password; // 替换为实际的密码
    //     const appkey = 1448278e6;
    //     const t = {
    //         appkey: appkey,
    //         device: `vipmember${this.getRamNumber()}`,
    //         action: "access",
    //         channel: "1000000002",
    //         ecid: "3010311001",
    //         version: "v2",
    //         tag: 1,
    //         union_platform: 1,
    //         account: this.account,
    //         password: this.password,
    //     }
    //     const n = penc.ps(t)
    //     n.h.appkey = appkey
    //     const res = await axios(`https://member.zlongame.com/passport/method_login.zlongame?d=${n.d}`, {
    //         method: "GET",
    //         headers: {
    //             ...n.h
    //         }
    //     })

    //     const param = {
    //         "zl-ret-nonce": res.headers['zl-ret-nonce'],
    //         "zl-ret-sign": res.headers['zl-ret-sign'],
    //         getResponseHeader: function (e) {
    //             return param[e]
    //         }
    //     }

    //     const loginRes: LoginResponse = penc.de(res.data.ret, param, n.h['zl-p-nonce'])
    //     // this.logger.info(inspect(loginRes, { depth: 2 }))
    //     // console.log(inspect(loginRes, { depth: 3 }))
    //     this.loginRes = loginRes
    //     this.userInfo = loginRes.data
    // }

    async request(url: string, params: any, config: any) {
        const headers = {
            'Content-Type': 'application/json',
            reqTs: new Date().getTime(),
            appKey: this.currentGameAppkey,
            token: config.func === "MP" ? "" : this.currentToken,
            Origin: "https://vip-api.zlongame.com",
            ...config,
        }
        const data = {
            accId: this.userInfo.accountid,
            uid: this.currentUser?.userid.toString(),
            did: this.currentUser?.device,
            tid: this.currentUser?.token,
            appKey: this.currentUser?.appkey.toString(),
            ...params,
        }

        const res = await axios({
            url: `https://vip-api.zlongame.com` + url,
            method: "POST",
            data,
            headers
        })
        if(res.data.code===400){
            console.log(res.data)
            console.log("400headers:",inspect(headers, { depth: 3 }))
            console.log("400data:",inspect(data, { depth: 3 }))
        }
        return res
    }

    async accountLogin() {
        if (!this.currentUser) {
            throw new Error("没有对应账号")
        }
        const res = await this.request('/web/service', {}, { func: "MP" })
        this.currentToken = res.headers['sid']
        this.currentUserDetail = res.data.data as CurrentUserDetail
        if (res.data.code == 400) {
            throw new Error(res.data.msg)
        }
    }

    async projectGift(): Promise<Gift[]> {
        const res = await this.request('/web/service', {
            level: this.currentUserDetail.currentLevel, // 等级
            pageNumber: 1,
            pageCount: 20,
        }, { func: "GTP" })
        // console.log(inspect(res.data, { depth: 3 }));
        return res.data.data.data
    }

    async homeGameList(): Promise<GameInfo[]> {
        const res = await this.request('/web/service', {}, { func: "APP" })
        return res.data.data
    }

    async queryRoleList(): Promise<GameInfo[]> {
        const res = await this.request('/web/service', {}, { func: "RO" })
        return res.data.data
    }

    async autoProjectGift(cycleType: CycleType, roleId: string, serverId: string) {
        const giftList = await this.projectGift()
        const filteredGifts = giftList.filter(gift => {
            return gift.cycleType === cycleType
                && gift.status !== 1
        })

        const getGiftResult = await Promise.all(filteredGifts.map(async (gift) => {
            const result = await this.giftReceive(gift.id, roleId, serverId);
            return {
                ...gift,
                getResult: result
            };
        }));

        return getGiftResult
    }

    async giftReceive(giftId, roleId, serverId) {
        const res = await this.request('/web/service', {
            level: this.currentUserDetail.currentLevel, // 等级
            giftId: giftId,
            detailInfo: JSON.stringify({
                roleId,
                serverId,
            })
        }, { func: "GGT" })
        return res.data;
    }

    async signIn() {
        const signRes = await this.request('/web/service', {}, { func: "SR" })
        let isSign = false
        if (signRes.data?.data?.record) {
            // record: { '1': 0, '2': 1, '3': 1, '4': 1, '5': 1, '6': 3, '7': 3 },
            Object.values(signRes.data?.data?.record).forEach((item: number) => {
                if (item === 1) {
                    isSign = true
                } else if (item === 2) {
                    isSign = false
                }
            })
        }
        if (isSign) {
            return { code: 500001, msg: '今日已签到' }
        }
        const res = await this.request('/web/service', {}, { func: "MS" })
        return res.data;
    }

}
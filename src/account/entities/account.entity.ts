import { Exclude, Transform } from 'class-transformer';
import * as dayjs from 'dayjs';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate, ManyToOne } from 'typeorm';
import * as CryptoJS from 'crypto-js';
import { desensitizePhone } from '../../common/utils/transform'
import { ZlVip } from './zlvip.entity';
// 加密密钥，实际使用中应妥善保管
const SECRET_KEY = 'mz-account-secret-key-myq';

@Entity('account')
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  userid: string;

  @Column()
  roleid: string;

  @Column()
  serverid: string;

  @CreateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  updatedAt: Date;

  @Column()
  @Transform(desensitizePhone, { toPlainOnly: true })
  account: string;

  @Column()
  @Exclude()
  password: string;

  // @Column({ type: 'json', nullable: true, comment: '用户信息JSON对象' })
  // @Transform(
  //   ({ value }) => (typeof value === 'string' ? JSON.parse(value) : value),
  //   { toClassOnly: true }
  // )
  // @Transform(
  //   ({ value }) => (typeof value === 'object' ? JSON.stringify(value) : value),
  //   { toPlainOnly: true }
  // )
  // userInfo: any;

  @BeforeInsert()
  @BeforeUpdate()
  encryptPassword() {
    if (this.password) {
      this.password = CryptoJS.AES.encrypt(this.password, SECRET_KEY).toString();
    }
  }

  // 新增解密方法
  decryptPassword() {
    if (this.password) {
      const bytes = CryptoJS.AES.decrypt(this.password, SECRET_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    }
    return null;
  }

  @ManyToOne(() => ZlVip, zlVip => zlVip.accounts)
  zlVip: ZlVip;
}
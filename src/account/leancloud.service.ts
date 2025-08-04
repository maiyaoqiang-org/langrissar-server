import { Injectable } from "@nestjs/common";
import * as AV from 'leancloud-storage'
@Injectable()
export class LeanCloudService {
  constructor(){
    AV.init({
        appId: process.env.VITE_APP_AV_APP_ID || '',
        appKey: process.env.VITE_APP_AV_APP_KEY || '',
        serverURL: process.env.VITE_APP_AV_SERVER_URL,
    });
  }

  async getValidGiftCodes(): Promise<string[]> {
    const query = new AV.Query('GiftCode');
    query.equalTo('state', 'valid');
    const results = await query.find();
    return results.map(item => item.get('code'));
  }
}
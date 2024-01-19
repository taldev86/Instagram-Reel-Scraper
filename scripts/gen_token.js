
import { generateLongLivedAccessToken } from '../src/instagram.js';

const run = async () => {
  console.log('====STARTING====');
  // short-lived access token can be generated here: https://developers.facebook.com/tools/explorer/
  // app id and app secret can be found in your app stings: https://developers.facebook.com/apps/
  const accessToken = await generateLongLivedAccessToken({
    accessToken: "put your short-lived access token here",
    appId: "put your app id here",
    appSecret: "put your app secret here",
  });
  console.log('====RESULT====');
  console.log(accessToken);
  console.log('====DONE====');
};

run();

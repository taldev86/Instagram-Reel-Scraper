import axios from 'axios';

const GRAPH_API_VERSION = 'v18.0';
const getStatusOfUpload = async (accessToken, igContainerId) => {
  const response = await axios.get(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${igContainerId}`,
    { params: { access_token: accessToken, fields: 'status_code' } }
  );

  return response.data.status_code;
};

const publishMediaContainer = async (
  accessToken,
  instagramAccountId,
  creationId
) => {
  const response = await axios.post(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccountId}/media_publish`,
    { access_token: accessToken, creation_id: creationId }
  );

  return response.data;
};

const fetchPermalink = async (accessToken, mediaId) => {
  const response = await axios.get(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`,
    { params: { access_token: accessToken, fields: 'permalink' } }
  );

  return response.data;
};

const uploadReelsToContainer = async (
  accessToken,
  instagramAccountId,
  caption,
  videoUrl,
  coverUrl
) => {
  console.log('video url', videoUrl);
  const response = await axios.post(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccountId}/media`,
    {
      access_token: accessToken,
      caption,
      media_type: 'REELS',
      video_url: videoUrl,
      cover_url: coverUrl,
    }
  );

  return response.data;
};

export const postInstagramReel = async ({
  accessToken,
  pageId,
  description,
  thumbnailUrl,
  videoUrl,
}) => {
  const { id: containerId } = await uploadReelsToContainer(
    accessToken,
    pageId,
    description,
    videoUrl,
    thumbnailUrl
  );

  let status = null;
  while (status !== 'FINISHED') {
    status = await getStatusOfUpload(accessToken, containerId);
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((r) => setTimeout(r, 1000));
  }

  const { id: creationId } = await publishMediaContainer(
    accessToken,
    pageId,
    containerId
  );

  const { permalink } = await fetchPermalink(accessToken, creationId);

  return { creationId, permalink };
};

const get60DaysToken = async ({ accessToken, appId, appSecret }) => {
  const res = await axios.get(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`,
    {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: accessToken,
      },
    }
  );

  const { access_token: longLivedAccessToken } = res.data;

  return longLivedAccessToken;
};

const getUserId = async (longTermToken) => {
  const res = await axios.get(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/me`,
    {
      params: {
        access_token: longTermToken,
      },
    }
  );

  const { id: userId } = res.data;
  return userId;
};

export const generateLongLivedAccessToken = async ({
  accessToken,
  appId,
  appSecret,
}) => {
  // debug token https://developers.facebook.com/tools/debug/accesstoken/
  // get 2 month token
  const longTermToken = await get60DaysToken({
    accessToken,
    appId,
    appSecret,
  });

  // get user id
  const userId = await getUserId(longTermToken);

  // Get a non-expiring token
  const res = await axios.get(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${userId}/accounts`,
    {
      params: {
        access_token: longTermToken,
      },
    }
  );

  const { data } = res.data;
  const { access_token: nonExpiringToken } = data[0];
  return nonExpiringToken
};

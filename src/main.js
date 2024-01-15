import { Actor, log } from 'apify';
import { sleep } from 'crawlee';
import { postInstagramReel } from './instagram.js';

await Actor.init();

const input = await Actor.getInput();
// log.info('Input:', input);
log.info("====Let's publish to Instagram====");

// fixed dataset name, so we can fetch results in next run
const dataset = await Actor.openDataset('instagram-reel-publisher');

// get results from previous run
const previousResults = await dataset.getData({
  limit: 10000,
});

// get previous items, which are already published
const previousItems = (previousResults.items || []).filter((item) => {
  return item.status === 'SUCCESS';
});

log.info('Previous items are:', {
  items: previousItems.length,
});

// call actor apify/instagram-reel-scraper
log.info('Calling actor apify/instagram-reel-scraper');
const run = await Actor.call('apify/instagram-reel-scraper', {
  username: input.username,
  resultsLimit: input.resultsLimit,
});
log.info('Actor apify/instagram-reel-scraper finished');

// fetch results from dataset of apify/instagram-reel-scraper if has dataset
let items = [];
if (run && run.defaultDatasetId) {
  const actorDataset = await Actor.openDataset(run.defaultDatasetId, {
    forceCloud: true,
  });
  const data = await actorDataset.getData();
  items = (data.items || [])
    .sort((a, b) => {
      // sort by timestamp (2023-12-25T15:44:18.000Z format)
      return new Date(b.timestamp) - new Date(a.timestamp);
    })
    .filter((item) => {
      // filter out items which are already published
      const isAlreadyPublished = previousItems.find((previousItem) => {
        return previousItem.url === item.url;
      });
      if (isAlreadyPublished) {
        log.info('Item is already published:', {
          url: item.url,
          instagramUrl: isAlreadyPublished.instagramUrl,
        });
      }
      return !isAlreadyPublished;
    });
  log.info('Fetched results from dataset:', {
    items: items.length,
    datasetId: run.defaultDatasetId,
  });
}

if (items.length === 0) {
  log.info('No results found');
} else {
  log.info('Publishing to Instagram, this might take a while...');
  const { accessToken, instagramPageID, hashtags } = input;

  for (const item of items) {
    const { url, videoUrl, thumbnailUrl, caption, ownerUsername } = item;
    log.info('Publishing to Instagram:', {
      url,
    });
    const description = `${caption}\n\nCredit: @${ownerUsername}\n\n${hashtags.join(
      ' '
    )}`;
    await postInstagramReel({
      accessToken: accessToken,
      pageId: instagramPageID,
      description: description,
      thumbnailUrl: thumbnailUrl,
      videoUrl: videoUrl,
    })
      .then((res) => {
        log.info('Published to Instagram:', {
          url,
          instagramUrl: res.permalink,
        });
        dataset.pushData({
          videoUrl,
          thumbnailUrl,
          caption,
          ownerUsername,
          status: 'SUCCESS',
          instagramUrl: res.permalink,
          description,
          url,
        });
      })
      .catch((err) => {
        log.error('Error publishing to Instagram:', err);
        dataset.pushData({
          videoUrl,
          thumbnailUrl,
          url,
          caption,
          ownerUsername,
          status: 'ERROR',
          error: err,
        });
      });

    // delay between each publish
    await sleep(input.delay || 10000);
  }

  log.info('====Finished publishing to Instagram====');
}

await Actor.exit();

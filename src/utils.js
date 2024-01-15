export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getInstagramUrl = (username) => `https://www.instagram.com/${username}/`;

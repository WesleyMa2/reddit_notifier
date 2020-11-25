let util = require('util');
let https = require('https');

const notifier = require('node-notifier');


let SUBREDDIT = 'bapcsalescanada';
let INTERVAL = 60000;

if (process.argv.length >= 3) SUBREDDIT = process.argv[2] // Subreddit
if (process.argv.length >= 4) INTERVAL = process.argv[3] * 1000 // Polling interval (Seconds)

const URL = util.format('https://www.reddit.com/r/%s/new.json', SUBREDDIT);

let lastTimeStamp = new Date(0);
// const localTZoffset = lastTimeStamp.getTimezoneOffset() / 60;

function dateToString(timestamp, useLocal) {
    let dateObj = new Date((timestamp));
    if (useLocal) {
        dateObj.setHours(dateObj.getHours() - 8);
    }
    return dateObj.toLocaleDateString() + ' - ' + dateObj.toLocaleTimeString();
}

function pollReddit() {
    // console.log('Last post- ' + dateToString(lastTimeStamp, true))
    https.get(URL, (resp) => {
        let rawJson = '';
        let latestPosts = null;
        // A chunk of data has been recieved.
        resp.on('data', (chunk) => {
            rawJson += chunk;
        });
        // The whole response has been received.
        resp.on('end', () => {
            latestPosts = JSON.parse(rawJson).data.children;
            const firstPost = latestPosts[0].data;
            const firstPostTimestamp = new Date(firstPost.created * 1000);
            // On first poll, set last timestamp to latest post
            if (lastTimeStamp.getTime() === 0) {
                lastTimeStamp = firstPostTimestamp;
                return;
            }
            // On subsequent polls, print out a message for each post newer than the last saved timestamp
            let count = 0;
            for (let i = 0; i < latestPosts.length; i++) {
                const post = latestPosts[i];
                let postTimestamp = post.data.created * 1000;
                if (postTimestamp > lastTimeStamp) {
                    count++
                    const postTitle = post.data.title;
                    const postLink = post.data.url_overridden_by_dest;
                    console.log(util.format('\n[%s]\t%s', dateToString(postTimestamp, true), postTitle));
                    console.log('\t\t\t\t' + postLink);
                } else { break; }
            }
            // Update latest timestamp, push notification for latest post
            if (firstPostTimestamp > lastTimeStamp) {
                lastTimeStamp = firstPostTimestamp;
                notifier.notify(
                    {
                        title: count + (count === 25 ? '+': '') + ' new posts!',
                        message: firstPost.title,
                        sound: false,
                        wait: true,
                        timeout: 5,
                        open: firstPost.link,
                    }
                );
            };
        });
    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
}
console.log(util.format('Checking [%s] for new posts every %i seconds', SUBREDDIT, INTERVAL / 1000));
console.log('##########################################################');
setInterval(pollReddit, INTERVAL);
pollReddit()


let util = require('util');
let https = require('https');

const notifier = require('node-notifier');


let SUBREDDIT = 'bapcsalescanada';
let INTERVAL = 60000;
let filter = function (title) { return true };
let flagOffset = 0;

// Set include/exlude filters
const includeFlag = process.argv.indexOf('-i');
const excludeFlag = process.argv.indexOf('-e');
if (includeFlag > -1) {
    filter = function (title) { return new RegExp(process.argv[includeFlag + 1], 'gi').test(title) }
    flagOffset += 2;
} else if (excludeFlag > -1) {
    filter = function (title) { return !(new RegExp(process.argv[excludeFlag + 1], 'gi').test(title)) }
    flagOffset += 2;
}

// Set subbreddit
if (process.argv.length >= 3 + flagOffset) SUBREDDIT = process.argv[2 + flagOffset];
// Set polling interval (Seconds)
if (process.argv.length >= 4 + flagOffset) INTERVAL = process.argv[3 + flagOffset] * 1000;


const URL = util.format('https://www.reddit.com/r/%s/new.json', SUBREDDIT);

let lastTimeStamp = new Date(0);
const localTZoffset = lastTimeStamp.getTimezoneOffset() / 60 + 3; // too lazy to make this part good
function dateToString(timestamp, useLocal) {
    let dateObj = new Date((timestamp));
    if (useLocal) {
        dateObj.setHours(dateObj.getHours() - localTZoffset);
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
            // and pass the filter
            let count = 0;
            for (let i = 0; i < latestPosts.length; i++) {
                const post = latestPosts[i];
                let postTimestamp = post.data.created * 1000;
                const postTitle = post.data.title;
                if (postTimestamp > lastTimeStamp && filter(postTitle)) {
                    count++
                    const postLink = post.data.url_overridden_by_dest;
                    console.log(util.format('\n[%s]\t%s', dateToString(postTimestamp, true), postTitle));
                    console.log('\t\t\t\t' + postLink);
                } else { break; }
            }
            // Update latest timestamp, push notification for latest post
            if (count > 0) {
                lastTimeStamp = firstPostTimestamp;
                notifier.notify(
                    {
                        title: count + (count === 25 ? '+' : '') + ' new posts!',
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


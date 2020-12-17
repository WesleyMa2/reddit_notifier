const util = require('util');
const https = require('https');
const notifier = require('node-notifier');

let SUBREDDIT = 'bapcsalescanada';
let INTERVAL = 60000;
let filter = function (title) { return true };

// Handle args
let argsCount = 2;
const includeFlag = process.argv.indexOf('-i');
const excludeFlag = process.argv.indexOf('-e');
const intervalFlag = process.argv.indexOf('-t');
if (includeFlag > -1) {
    filter = function (title) { return new RegExp(process.argv[includeFlag + 1], 'gi').test(title) }
    argsCount += 2;
}
if (excludeFlag > -1) {
    filter = function (title) { return !(new RegExp(process.argv[excludeFlag + 1], 'gi').test(title)) }
    argsCount += 2;
}
if (intervalFlag > -1) {
    INTERVAL = process.argv[1 + intervalFlag] * 1000;
    argsCount += 2;
}
if (argsCount > 2 && process.argv.length > argsCount + 1 ||
    process.argv.length > argsCount) SUBREDDIT = process.argv[process.argv.length-1];


let url = util.format('https://www.reddit.com/r/%s/new.json', SUBREDDIT);

let latestPost;
// const localTZoffset = latestPost.getTimezoneOffset() / 60 + 3; // too lazy to make this part good
function dateToString(timestamp, useLocal) {
    let dateObj = new Date((timestamp));
    if (useLocal) {
        dateObj.setHours(dateObj.getHours() - 8);
    }
    return dateObj.toLocaleDateString() + ' - ' + dateObj.toLocaleTimeString();
}

function pollReddit() {
    // console.log('Last post- ' + dateToString(lastTimeStamp, true))
    https.get(url, (resp) => {
        let rawJson = '';
        let json;
        let postsArr = null;
        resp.on('data', (chunk) => {
            rawJson += chunk;
        });

        resp.on('end', () => {
            json = JSON.parse(rawJson);
            if(!json.data) {
                console.log("ERROR! Recieved the following instead:")
                console.log(json);
                return;
            }
            postsArr = JSON.parse(rawJson).data.children;
            const firstPost = postsArr[0] ? postsArr[0].data : null;
            // On first poll, update latest post
            if (!latestPost) {
                latestPost = firstPost.name;
                url = util.format('https://www.reddit.com/r/%s/new.json?before=%s', SUBREDDIT, latestPost);
                return;
            }
            // On subsequent polls, print out a message for each post newer than the last seen post
            // and passes the filter
            for (let i = postsArr.length; i > 0; i--) {
                const post = postsArr[i-1].data;
                const postTimestamp = post.created * 1000;
                const postTitle = post.title;
                const postLink = post.url_overridden_by_dest;
                if (filter(postTitle)) {
                    console.log(util.format('\n\033[0;32m[%s]\033[0m\t%s', dateToString(postTimestamp, true), postTitle));
                    console.log('\t\t\t\t\033[1;34m' + postLink);
                }
            }

            if (postsArr.length > 0) {
                latestPost = firstPost.name;
                url = util.format('https://www.reddit.com/r/%s/new.json?before=%s', SUBREDDIT, latestPost);
                notifier.notify(
                    {
                        title: postsArr.length + (postsArr.length === 25 ? '+' : '') + ' new posts!',
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
console.log(util.format('Checking r/%s for new posts every %i seconds\033[0m', SUBREDDIT, INTERVAL / 1000));
if (excludeFlag > -1) console.log('Excluding all posts that match given regex');
else if (includeFlag > -1) console.log('Including only posts that match given regex');
console.log('##########################################################');
setInterval(pollReddit, INTERVAL);
pollReddit()


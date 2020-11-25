# Reddit Notifier
Simple node js script that polls a given subreddit, pushing a desktop notif on new posts

## Setup
Make sure node and npm are installed.
Run `npm install` on first time setup.

## Usage
`node app.js [FLAGS...] [SUBREDDIT] [POLLING_INTERVAL(Sec)]`
### No Flags
`node app.js`  
Will use the default subreddit(r/bapcsalescanada) and a default interval(60s)
### Include (case insensetive regex)
`node ./app.js -i "\[(GPU)|(CPU)\]"`  
Only includes posts that pass the given regex.
### Exclude (case insensetive regex)
`node ./app.js -e "\[(GPU)|(CPU)\]"`  
Excludes all posts that pass the given regex. Will override the include flag if passed in together.
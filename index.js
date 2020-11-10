const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const neo4j = require('neo4j-driver');
const { v4: uuidv4 } = require('uuid');
const fs = require("fs");
const readline = require('readline');
const winston = require('winston');
const getUrls = require('get-urls');
const puppeteer = require('puppeteer');
const { LoggingWinston } = require('@google-cloud/logging-winston');
const loggingWinston = new LoggingWinston();
const logger = winston.createLogger({
    level: 'info',
    transports: [
        new winston.transports.Console(),
        // Add Stackdriver Logging
        loggingWinston,
    ],
});

const readInterface = readline.createInterface({
    input: fs.createReadStream('bad-words.txt'),
    console: false
});

var badWordsSet = new Set()
readInterface.on('line', function (line) {
    badWordsSet.add(line)
});

const uri = 'neo4j+s://6353106d.databases.neo4j.io'
const json = JSON.parse(fs.readFileSync('secrets.json'))
const user = json.username;
const password = json.password;

var app = express();
const port = process.env.PORT || 9000;
var jsonParser = bodyParser.json()

app.use(cors());

app.get('/', (req, res, next) => {
    res.send('Hello World!')
})

app.post('/user/:userID/update', jsonParser, async (req, res, next) => {
    let userID = req.params.userID
    console.log(userID)
    if(req.body.fields) {
        let fields = req.body.fields
        let keys = Object.keys(req.body.fields)
        keys.forEach( async key => {
            const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
            const session = driver.session()
            //logger.info(key)
            //logger.info(req.body.fields[key])


            try {
                const session = driver.session()
                const writeQuery =
                    `MATCH (n:User)
                    WHERE n.id='${userID}'
                    SET n = $fields`
    
                const writeResult = await session.writeTransaction(tx =>
                    tx.run(writeQuery, {fields})
                )
    
            } catch (error) {
                //logger.info(error)
                console.log(error)
            } finally {
                await session.close()
                await driver.close()
            }
        })
        res.send({"response": "success!"})
    } else {
        res.send({"response": "Please include fields field"})
    }
})

app.post('/user/:userID', jsonParser, async (req, res, next) => {
    if (req.params.userID || req.params.userName == "") {
        if (req.body.handle || req.body.handle == "") {
            if (req.body.firstName || req.body.firstName == "") {
                if (req.body.lastName || req.body.lastName == "") {
                    if (req.body.screenNames || req.body.screenNames == "") {
                        if (req.body.ping || req.body.ping == 0) {
                            if (req.body.latitude || req.body.latitude == 0) {
                                if (req.body.longitude || req.body.longitude == 0) {
                                    if (req.body.avatarVal || req.body.avatarVal == 0) {
                                        if(req.body.lastLogin) {
                                            let userID = req.params.userID
                                            let handle = req.body.handle
                                            let firstName = req.body.firstName
                                            let lastName = req.body.lastName
                                            let screenNames = req.body.screenNames
                                            let ping = req.body.ping
                                            let latitude = req.body.latitude
                                            let longitude = req.body.longitude
                                            let avatarVal = req.body.avatarVal
                                            let lastLogin = req.body.lastLogin

                                            const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
                                            const session = driver.session();

                                            try {
                                                const writeQuery = `MERGE (u1:User { id: $userID, handle: $handle, firstName: $firstName, lastName: $lastName, screenNames: $screenNames, ping: $ping, latitude: $latitude, longitude: $longitude, avatarVal: $avatarVal, lastLogin: $lastLogin })
                                                                    RETURN u1`

                                                const writeResult = await session.writeTransaction(tx =>
                                                    tx.run(writeQuery, { userID, handle, firstName, lastName, screenNames, ping, latitude, longitude, avatarVal, lastLogin })
                                                )

                                            } catch (error) {
                                                var result = { "response": "Unknown error" }
                                                res.send(result)
                                            } finally {
                                                var result = { "response": "Success!" }
                                                res.send(result)
                                                await session.close()
                                            }

                                            await driver.close()
                                        } else {
                                            var result = { "response": "Missing lastLogin field" }
                                            res.send(result)
                                        }
                                    } else {
                                        var result = { "response": "Missing avatarVal field" }
                                        res.send(result)
                                    }
                                } else {
                                    var result = { "response": "Missing longitude field" }
                                    res.send(result)
                                }
                            } else {
                                var result = { "response": "Missing latitude field" }
                                res.send(result)
                            }
                        } else {
                            var result = { "response": "Missing ping field" }
                            res.send(result)
                        }
                    } else {
                        var result = { "response": "Missing screenNames field" }
                        res.send(result)
                    }
                } else {
                    var result = { "response": "Missing lastName field" }
                    res.send(result)
                }
            } else {
                var result = { "response": "Missing firstName field" }
                res.send(result)
            }
        } else {
            var result = { "response": "Missing handle field" }
            res.send(result)
        }
    } else {
        var result = { "response": "Missing userKD field" }
        res.send(result)
    }
})

app.get('/user/:userID', jsonParser, async (req, res, next) => {
    logger.info("In user endpoint")
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
    const session = driver.session()

    const userID = req.params.userID
    var users = []

    try {

        const readQuery = `match (u:User) where u.id = "${userID.toString()}" return u`
        const readResult = await session.readTransaction(tx =>
            tx.run(readQuery, {})
        )


        readResult.records.forEach(record => {
            users.push(record.get('u'))
        })
        if (users.length > 0) {

            let response = { "response": users[0] }
            res.send(response)
        } else {
            let response = { "response": "No users found" }
            res.send(response)
        }

    } catch (error) {
        res.send(error)
        console.error('Something went wrong: ', error)
    } finally {
        await session.close()
    }

    // Don't forget to close the driver connection when you're finished with it
    await driver.close()
})

app.post('/user/:userID/last-login', jsonParser, async(req, res, next) => {
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
    const session = driver.session()

    let userID = req.params.userID
    
    if(req.body.lastLogin) {
        let lastLogin = req.body.lastLogin
        try {
            const writeQuery =
                `MATCH (u:User { id: '${userID}' }) SET u.lastLogin = ${lastLogin}
            RETURN u`

            const writeResult = await session.writeTransaction(tx =>
                tx.run(writeQuery, {})
            )

        } catch (error) {
            console.log(error)
            var result = { "response": "Unknown Error Occurred" }
            res.send(result)
        } finally {
            var result = { "response": "Success!" }
            res.send(result)
            await session.close()
        }

        driver.close()

    } else {
        var result = {"response": "Please include the lastLogin field"}
        res.send(result)
    }
})

app.get('/usernames/:username', jsonParser, async (req, res, next) => {

    const username = req.params.username
    var lowerCasedUsername = username.toLowerCase()

    if (badWordsSet.has(lowerCasedUsername)) {
        var result = { "response": "This username contains a prohibited word." }
        res.send(result)
    } else {
        try {
            const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
            const session = driver.session()

            const readQuery = `match (u:User) where u.handle = "${username.toString()}" return u`
            const readResult = await session.readTransaction(tx =>
                tx.run(readQuery, {})
            )


            if (readResult.records.length == 0) {
                var result = { "response": "No users with this name." }
                res.send(result)
            } else {
                var result = { "response": "This username is already taken." }
                res.send(result)
            }
        } catch (error) {
            console.error('Something went wrong: ', error)
        } finally {
            await session.close()
        }

        // Don't forget to close the driver connection when you're finished with it
        await driver.close()
    }
})

app.get('/username/:username', jsonParser, async (req, res, next) => {
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
    const session = driver.session()

    const username = req.params.username
    var users = []

    try {

        const readQuery = `match (u:User) where u.handle = "${username.toString()}" return u`
        const readResult = await session.readTransaction(tx =>
            tx.run(readQuery, {})
        )
        readResult.records.forEach(record => {
            users.push(record.get('u'))
        })

        res.send(users[0])
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session.close()
    }

    // Don't forget to close the driver connection when you're finished with it
    await driver.close()
})

app.post('/game/:gameID', jsonParser, async (req, res, next) => {
    if (req.params.gameID || req.params.gameID == "") {
        if (req.body.description || req.body.description == "") {
            if (req.body.name || req.body.name == "") {
                if (req.body.ageRatings || req.body.ageRatings == "") {
                    if (req.body.videos || req.body.videos == [] || req.body.videos == "") {
                        if (req.body.coverURL || req.body.coverURL == "") {
                            if (req.body.firstReleaseDate || req.body.firstReleaseDate == 0) {
                                if (req.body.franchise || req.body.franchise == "") {
                                    if (req.body.genres || req.body.firstName == []) {
                                        if (req.body.platforms || req.body.firstName == []) {
                                            if (req.body.rating || req.body.rating == 0) {
                                                if (req.body.ratingCount || req.body.ratingCount == 0) {
                                                    if (req.body.screenshots || req.body.firstName == []) {
                                                        let gameID = req.params.gameID
                                                        let description = req.body.description
                                                        let name = req.body.name
                                                        let ageRatings = req.body.ageRatings
                                                        let videos = req.body.videos
                                                        let coverURL = req.body.coverURL
                                                        let firstReleaseDate = req.body.firstReleaseDate
                                                        let franchise = req.body.franchise
                                                        let genres = req.body.genres
                                                        let platforms = req.body.platforms
                                                        let rating = req.body.rating
                                                        let ratingCount = req.body.ratingCount
                                                        let screenshots = req.body.screenshots

                                                        const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
                                                        const session = driver.session();

                                                        try {
                                                            const writeQuery = `MERGE (g:Game { id: $gameID, description: $description, name: $name, ageRatings: $ageRatings, videos: $videos, coverURL: $coverURL, firstReleaseDate: $firstReleaseDate, franchise: $franchise, genres: $genres, platforms: $platforms, rating: $rating, ratingCount: $ratingCount, screenshots: $screenshots })
                                                                                RETURN g`

                                                            const writeResult = await session.writeTransaction(tx =>
                                                                tx.run(writeQuery, { gameID, description, name, ageRatings, videos, coverURL, firstReleaseDate, franchise, genres, platforms, rating, ratingCount, screenshots })
                                                            )

                                                        } catch (error) {
                                                            console.error('Something went wrong: ', error)
                                                        } finally {
                                                            var result = { "response": "Success!" }
                                                            res.send(result)
                                                            await session.close()
                                                        }

                                                        await driver.close()
                                                    } else {
                                                        res.sendStatus("Missing screenshots field")
                                                    }
                                                } else {
                                                    res.sendStatus("Missing ratingCount field")
                                                }
                                            } else {
                                                res.sendStatus("Missing rating field")
                                            }
                                        } else {
                                            res.sendStatus("Missing platforms field")
                                        }
                                    } else {
                                        res.sendStatus("Missing genres field")
                                    }
                                } else {
                                    res.sendStatus("Missing franchise field")
                                }
                            } else {
                                res.sendStatus("Missing firstReleaseDate field")
                            }
                        } else {
                            res.sendStatus("Missing coverURL field")
                        }
                    } else {
                        res.sendStatus("Missing videos field")
                    }
                } else {
                    res.sendStatus("Missing ageRatings field")
                }
            } else {
                res.send("Missing name field");
            }
        } else {
            res.send("Missing description field");
        }
    } else {
        res.send("Missing gameID field");
    }
})

app.post('/report-issue', jsonParser, async (req, res, next) => {
    if (req.body.userID || req.body.userID == "") {
        if (req.body.time || req.body.time == 0) {
            if (req.body.text || req.body.text == "") {
                let userID = req.body.userID
                let reportText = req.body.text
                let time = req.body.time
                let reportID = uuidv4();

                const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
                const session = driver.session();

                try {
                    const writeQuery =
                        `CREATE (r1:Report { id: $reportID, time: $time, text: $reportText })
                    RETURN r1`

                    const writeResult = await session.writeTransaction(tx =>
                        tx.run(writeQuery, { reportID, time, reportText })
                    )

                } catch (error) {
                    console.error('Something went wrong: ', error)
                } finally {
                    await session.close()
                }



                const session2 = driver.session();

                try {
                    const writeQuery2 =
                        `MATCH (u:User),(r:Report)
                    WHERE u.id = \"${userID}\" AND r.id = \"${reportID}\"
                    CREATE (u)-[r1:Reported]->(r)
                    RETURN r1`

                    const writeResult = await session2.writeTransaction(tx =>
                        tx.run(writeQuery2, {})
                    )

                } catch (error) {
                    console.error('Something went wrong: ', error)
                } finally {
                    var result = { "response": "Success!" }
                    res.send(result)
                    await session2.close()
                }

                await driver.close()

            } else {
                res.send("Missing text field");
            }
        } else {
            res.send("Missing time field");
        }
    } else {
        res.send("Missing userID field");
    }
})

app.post('/post/:postID', jsonParser, async (req, res, next) => {

    if (req.params.postID) {
        if (req.body.time) {
            if (req.body.text) {
                if (req.body.user) {
                    if (req.body.user.avatarVal || req.body.user.avatarVal == 0.0) {
                        if (req.body.user.handle) {
                            if (req.body.user.id) {
                                if (req.body.game) {
                                    if (req.body.game.name) {
                                        if (req.body.game.id) {
                                            if (req.body.game.coverURL) {
                                                if (req.body.game.rating) {
                                                    let postID = req.params.postID
                                                    let time = req.body.time
                                                    let text = req.body.text
                                                    let avatarVal = req.body.user.avatarVal
                                                    let userID = req.body.user.id.toString()
                                                    let handle = req.body.user.handle
                                                    let gameID = req.body.game.id
                                                    let coverURL = req.body.game.coverURL
                                                    let gameName = req.body.game.name
                                                    let rating = req.body.game.rating
                                                    let imageURL = ""
                                                    let imagePath = ""
                                                    if (req.body.imageURL) {
                                                        if (req.body.imagePath) {
                                                            imageURL = req.body.imageURL
                                                            imagePath = req.body.imagePath
                                                        } else {
                                                            res.send({ "response": "Please include imagePath field" })
                                                        }
                                                    }
                                                    var textArray = text.split(' ')
                                                    for (var i = 0; i < textArray.length; i++) {
                                                        if(badWordsSet.has(textArray[i])){
                                                            var newText = ''
                                                            for (var j = 0; j < textArray[i].length; j++) {
                                                                newText += '*'
                                                            }
                                                            textArray[i] = newText
                                                        }
                                                    }
                                                    text = ''
                                                    for (var i = 0; i < textArray.length; i++) {
                                                        text += textArray[i] + ' '
                                                    }

                                                    if (req.body.isComment) {
                                                        if (req.body.parentPostID) {
                                                            let parentPostID = req.body.parentPostID

                                                            const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
                                                            const session = driver.session();

                                                            try {
                                                                const writeQuery = `CREATE (p:Post { id: $postID, time: $time, text: $text, avatarVal: $avatarVal, userID: $userID, handle: $handle, coverURL: $coverURL, gameName: $gameName, gameID: $gameID, rating: $rating, imageURL: $imageURL, imagePath: $imagePath, numUpvotes: 0})
                                                                                    RETURN p`

                                                                const writeResult = await session.writeTransaction(tx =>
                                                                    tx.run(writeQuery, { postID, time, text, avatarVal, userID, handle, coverURL, gameName, gameID, rating, imageURL, imagePath})
                                                                )

                                                            } catch (error) {
                                                                console.error('Something went wrong: ', error)
                                                            } finally {
                                                                await session.close()
                                                            }

                                                            const session2 = driver.session();

                                                            try {
                                                                const writeQuery2 =
                                                                    `MATCH (u:User),(p:Post)
                                                                WHERE u.id = \"${userID}\" AND p.id = \"${postID}\"
                                                                CREATE (u)-[r1:Posted]->(p)
                                                                RETURN r1`

                                                                const writeResult = await session2.writeTransaction(tx =>
                                                                    tx.run(writeQuery2, {})
                                                                )

                                                            } catch (error) {
                                                                console.error('Something went wrong: ', error)
                                                            } finally {
                                                                await session2.close()
                                                            }

                                                            const session3 = driver.session();

                                                            try {
                                                                const writeQuery2 =
                                                                    `MATCH (p1:Post),(p2:Post)
                                                                WHERE p1.id = \"${postID}\" AND p2.id = \"${parentPostID}\"
                                                                CREATE (p1)-[r1:CommentOf]->(p2)
                                                                RETURN r1`

                                                                const writeResult = await session3.writeTransaction(tx =>
                                                                    tx.run(writeQuery2, {})
                                                                )

                                                            } catch (error) {
                                                                console.error('Something went wrong: ', error)
                                                            } finally {
                                                                var result = { "response": "Success!" }
                                                                res.send(result)
                                                                await session3.close()
                                                            }

                                                            await driver.close()

                                                        } else {
                                                            res.send({ "response": "Please include the parentPostID field" })
                                                        }
                                                    } else {
                                                        const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
                                                        const session = driver.session();

                                                        try {
                                                            const writeQuery = `CREATE (p:Post { id: $postID, time: $time, text: $text, avatarVal: $avatarVal, userID: $userID, handle: $handle, coverURL: $coverURL, gameName: $gameName, gameID: $gameID, rating: $rating, imageURL: $imageURL, imagePath: $imagePath, numUpvotes: 0})
                                                                                RETURN p`

                                                            const writeResult = await session.writeTransaction(tx =>
                                                                tx.run(writeQuery, { postID, time, text, avatarVal, userID, handle, coverURL, gameName, gameID, rating, imageURL, imagePath})
                                                            )

                                                        } catch (error) {
                                                            console.error('Something went wrong: ', error)
                                                        } finally {
                                                            await session.close()
                                                        }

                                                        const session2 = driver.session();

                                                        try {
                                                            const writeQuery2 =
                                                                `MATCH (u:User),(p:Post)
                                                            WHERE u.id = \"${userID}\" AND p.id = \"${postID}\"
                                                            CREATE (u)-[r1:Posted]->(p)
                                                            RETURN r1`

                                                            const writeResult = await session2.writeTransaction(tx =>
                                                                tx.run(writeQuery2, {})
                                                            )

                                                        } catch (error) {
                                                            console.error('Something went wrong: ', error)
                                                        } finally {
                                                            await session2.close()
                                                        }

                                                        const session3 = driver.session();

                                                        try {
                                                            const writeQuery2 =
                                                                `MATCH (p:Post),(g:Game)
                                                            WHERE g.id = \"${gameID}\" AND p.id = \"${postID}\"
                                                            CREATE (p)-[r1:PostOf]->(g)
                                                            RETURN r1`

                                                            const writeResult = await session3.writeTransaction(tx =>
                                                                tx.run(writeQuery2, {})
                                                            )

                                                        } catch (error) {
                                                            console.error('Something went wrong: ', error)
                                                        } finally {
                                                            let result = {"response": "success!"}
                                                            res.send(result)
                                                            await session3.close()
                                                        }

                                                        await driver.close()

                                                    }
                                                } else {
                                                    res.send({ "response": "Please include game.rating field" })
                                                }
                                            } else {
                                                res.send({ "response": "Please include game.coverURL field" })
                                            }
                                        } else {
                                            res.send({ "response": "Please include game.id field" })
                                        }
                                    } else {
                                        res.send({ "response": "Please include game.name field" })
                                    }
                                } else {
                                    res.send({ "response": "Please include game field" })
                                }
                            } else {
                                res.send({ "response": "Please include user.id field" })
                            }
                        } else {
                            res.send({ "response": "Please include user.handle field" })
                        }
                    } else {
                        res.send({ "response": "Please include user.avatarVal field" })
                    }
                } else {
                    res.send({ "response": "Please include user field" })
                }
            } else {
                res.send({ "response": "Please include text field" })
            }
        } else {
            res.send({ "response": "Please include time field" })
        }
    } else {
        res.send({ "response": "Please include postID field" })
    }
})

app.get('/post/:postID', jsonParser, async (req, res, next) => {
    let postID = req.params.postID
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
    const session = driver.session()

    try {

        const readQuery = `MATCH (p:Post) where p.id = '${postID}' RETURN p`
        const readResult = await session.readTransaction(tx =>
            tx.run(readQuery, {})
        )
        var posts = [];
        readResult.records.forEach(record => {
            var post = (record.get('p'))
            var returnPost = new Post(post.properties.text, post.properties.numUpvotes.low, post.properties.imageURL, post.properties.imagePath, post.properties.time, post.properties.id, new MiniProfile(post.properties.userID, post.properties.handle, post.properties.avatarVal), new MiniGame(post.properties.gameID, post.properties.rating, post.properties.coverURL, post.properties.gameName))
            if(!posts.includes(returnPost)) {
                posts.push(returnPost)
            }
        })
        res.send({ "response": posts })
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session.close()
    }

    // Don't forget to close the driver connection when you're finished with it
    await driver.close()

})

app.post('/users/:userID/upvoted-post', jsonParser, async (req, res, next) => {
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
    const session = driver.session()
    if (req.params.userID || req.params.userID == "") {
        if (req.body.postID || req.body.postID == "") {
            let postID = req.body.postID
            let userID = req.params.userID


            var oldUpvoteCount = 0
            var newUpvoteCount = 0

           
            try {

                const readQuery = `match (p:Post) where p.id = "${postID}" return p.numUpvotes`
                const readResult = await session.readTransaction(tx =>
                    tx.run(readQuery, {})
                )
                readResult.records.forEach(record => {
                    oldUpvoteCount = (record.get('p.numUpvotes'))
                })

                newUpvoteCount = parseInt(oldUpvoteCount) + 1
            } catch (error) {
                console.error('Something went wrong: ', error)
            } finally {
                await session.close()
            }




            const session2 = driver.session();

            try {
                const writeQuery =
                    `MATCH (p:Post { id: '${postID}' }) SET p.numUpvotes = ${newUpvoteCount}
                    RETURN p`

                const writeResult = await session2.writeTransaction(tx =>
                    tx.run(writeQuery, {})
                )

            } catch (error) {
                var result = { "response": "Unknown Error Occurred" }
            } finally {
                await session2.close()
            }

            const session3 = driver.session();

            try {
                const writeQuery2 =
                    `MATCH (u:User),(p:Post)
                    WHERE u.id = \"${userID}\" AND p.id = \"${postID}\"
                    CREATE (u)-[r1:Upvoted]->(p)
                    RETURN r1`

                const writeResult = await session3.writeTransaction(tx =>
                    tx.run(writeQuery2, {})
                )

            } catch (error) {
                console.error('Something went wrong: ', error)
                var result = { "response": "Unknown Error Occurred" }
                res.send(result)
            } finally {
                var result = { "newUpvoteCount": newUpvoteCount }
                res.send(result)
                await session3.close()
            }
        } else {
            var result = { "newUpvoteCount": newUpvoteCount }
            res.send(result)
        }

        // Don't forget to close the driver connection when you're finished with it
        await driver.close()

    }
})

app.get('/:userID/has-upvoted/:postID', jsonParser, async(req, res, next) => {
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
    const session0 = driver.session()

    let userID = req.params.userID
    let postID = req.params.postID

    var hasUpvoted = "has not upvoted"
    
    try {

        const readQuery = `match (u:User)-[r:Upvoted]->(p:Post) where p.id = "${postID}" AND u.id = "${userID}" return p.numUpvotes`
        const readResult = await session0.readTransaction(tx =>
            tx.run(readQuery, {})
        )
        if(readResult.records.length > 0) {
            hasUpvoted = "has upvoted"
        }
        res.send({"response": hasUpvoted})
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session0.close()
    }
    await driver.close()
})

app.post('/users/:userID/downvoted-post', jsonParser, async (req, res, next) => {
    if (req.params.userID || req.params.userID == "") {
        if (req.body.postID || req.body.postID == "") {
            let postID = req.body.postID
            let userID = req.params.userID

            const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
            const session = driver.session()

            var oldUpvoteCount = 0
            var newUpvoteCount = 0

            try {

                const readQuery = `match (p:Post) where p.id = "${postID}" return p.numUpvotes`
                const readResult = await session.readTransaction(tx =>
                    tx.run(readQuery, {})
                )
                readResult.records.forEach(record => {
                    oldUpvoteCount = (record.get('p.numUpvotes'))
                })

                newUpvoteCount = parseInt(oldUpvoteCount) - 1
            } catch (error) {
                console.error('Something went wrong: ', error)
            } finally {
                await session.close()
            }




            const session2 = driver.session();

            try {
                const writeQuery =
                    `MATCH (p:Post { id: '${postID}' }) SET p.numUpvotes = ${newUpvoteCount}
                RETURN p`

                const writeResult = await session2.writeTransaction(tx =>
                    tx.run(writeQuery, {})
                )

            } catch (error) {
                var result = { "response": "Unknown Error Occurred" }
            } finally {
                await session2.close()
            }

            const session3 = driver.session();

            try {
                const writeQuery2 =
                `MATCH (u)-[r1:Upvoted]->(p) where u.id = "${userID}" AND p.id = "${postID}"
                DELETE r1
                RETURN r1`

                const writeResult = await session3.writeTransaction(tx =>
                    tx.run(writeQuery2, {})
                )

            } catch (error) {
                console.error('Something went wrong: ', error)
                var result = { "response": "Unknown Error Occurred" }
                res.send(result)
            } finally {
                var result = { "newUpvoteCount": newUpvoteCount }
                res.send(result)
                await session3.close()
            }

            // Don't forget to close the driver connection when you're finished with it
            await driver.close()

        }
    } else {
        res.send("Missing userID field");
    }
})

app.post('/users/:userID/followed-game', jsonParser, async (req, res, next) => {
    if (req.params.userID || req.params.userID == "") {
        if (req.body.gameID || req.body.gameID == "") {
            let userID = req.params.userID
            let gameID = req.body.gameID

            const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
            const session = driver.session();

            try {
                const writeQuery =
                    `MATCH (u:User),(g:Game)
                WHERE u.id = \"${userID}\" AND g.id = \"${gameID}\"
                MERGE (u)-[r:Follows]->(g)
                RETURN r`

                const writeResult = await session.writeTransaction(tx =>
                    tx.run(writeQuery, {})
                )

            } catch (error) {
                console.error('Something went wrong: ', error)
                res.send(error)
            } finally {
                var result = { "response": "Success!" }
                res.send(result)
                await session.close()
            }

            await driver.close()

        } else {
            res.send("Missing time field");
        }
    } else {
        res.send("Missing userID field");
    }
})

app.post('/users/:userID/unfollowed-game', jsonParser, async (req, res, next) => {
    if (req.params.userID || req.params.userID == "") {
        if (req.body.gameID || req.body.gameID == "") {
            let userID = req.params.userID
            let gameID = req.body.gameID

            const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
            const session = driver.session();

            try {
                const writeQuery =
                    `MATCH (u:User { id: '${userID}' })-[r:Follows]->(g:Game {id: '${gameID}'}) DELETE r`

                const writeResult = await session.writeTransaction(tx =>
                    tx.run(writeQuery, {})
                )

            } catch (error) {
                console.error('Something went wrong: ', error)
                res.send(error)
            } finally {
                var result = { "response": "Success!" }
                res.send(result)
                await session.close()
            }

            await driver.close()

        } else {
            res.send("Missing time field");
        }
    } else {
        res.send("Missing userID field");
    }
})

app.post('/users/:userID/rated-game', jsonParser, async (req, res, next) => {
    if (req.params.userID || req.params.userID == "") {
        if (req.body.gameID || req.body.gameID == "") {
            if (req.body.rating) {

                let userID = req.params.userID
                let gameID = req.body.gameID
                let rating = req.body.rating

                const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
                const session = driver.session()

                var ratings = []
                var ratingCounts = []
                var newRating = 0.0
                var newRatingCount = 0

                try {

                    const readQuery = `match (g:Game) where g.id = "${gameID}" return g.rating, g.ratingCount`
                    const readResult = await session.readTransaction(tx =>
                        tx.run(readQuery, {})
                    )
                    readResult.records.forEach(record => {
                        ratings.push(record.get('g.rating'))
                        ratingCounts.push(record.get('g.ratingCount'))
                    })

                    let oldTotalRating = ratings[0] * parseInt(ratingCounts[0])
                    newRatingCount = parseInt(ratingCounts[0]) + 1
                    newRating = (oldTotalRating + rating) / newRatingCount
                } catch (error) {
                    console.error('Something went wrong: ', error)
                } finally {
                    await session.close()
                }




                const session2 = driver.session();

                try {
                    const writeQuery =
                        `MATCH (g:Game { id: '${gameID}' }) SET g.rating = ${newRating}, g.ratingCount = ${newRatingCount}
                    RETURN g`

                    const writeResult = await session2.writeTransaction(tx =>
                        tx.run(writeQuery, {})
                    )

                } catch (error) {
                    var result = { "response": "Unknown Error Occurred" }
                } finally {
                    await session2.close()
                }

                const session3 = driver.session();

                try {
                    const writeQuery2 =
                        `MATCH (u:User),(g:Game)
                    WHERE u.id = \"${userID}\" AND g.id = \"${gameID}\"
                    CREATE (u)-[r1:Rated]->(g)
                    RETURN r1`

                    const writeResult = await session3.writeTransaction(tx =>
                        tx.run(writeQuery2, {})
                    )

                } catch (error) {
                    console.error('Something went wrong: ', error)
                    var result = { "response": "Unknown Error Occurred" }
                    res.send(result)
                } finally {
                    var result = { "newRating": newRating }
                    res.send(result)
                    await session3.close()
                }

                // Don't forget to close the driver connection when you're finished with it
                await driver.close()

            } else {
                res.send("Missing rating field");
            }
        } else {
            res.send("Missing time field");
        }
    } else {
        res.send("Missing userID field");
    }
})

app.get('/users/:userID/games-followed', jsonParser, async (req, res, next) => {
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
    const session = driver.session()

    const userID = req.params.userID

    try {

        const readQuery = `MATCH (u:User)-[:Follows]->(g:Game) WHERE u.id = '${userID}' RETURN g.id, g.rating, g.coverURL, g.name`
        const readResult = await session.readTransaction(tx =>
            tx.run(readQuery, {})
        )
        var gamesFollowed = [];
        readResult.records.forEach(record => {
            let id = record.get('g.id')
            let rating = record.get('g.rating')
            let coverURL = record.get('g.coverURL')
            let name = record.get('g.name')
            let miniGame = new MiniGame(id, rating, coverURL, name)
            gamesFollowed.push(miniGame)
        })
        res.send({ "response": gamesFollowed })
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session.close()
    }

    // Don't forget to close the driver connection when you're finished with it
    await driver.close()
})

app.get('/users/:userID/following', jsonParser, async (req, res, next) => {
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
    const session = driver.session()

    const userID = req.params.userID

    try {

        const readQuery = `MATCH (u1:User)-[:Follows]->(u2:User) WHERE u1.id = '${userID}' RETURN u2.id, u2.handle, u2.avatarVal`
        const readResult = await session.readTransaction(tx =>
            tx.run(readQuery, {})
        )
        var usersFollowed = [];
        readResult.records.forEach(record => {
            let id = record.get('u2.id')
            let handle = record.get('u2.handle')
            let avatarVal = record.get('u2.avatarVal')
            let miniProfile = new MiniProfile(id, handle, avatarVal)
            usersFollowed.push(miniProfile)
        })
        res.send({ "response": usersFollowed })
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session.close()
    }

    // Don't forget to close the driver connection when you're finished with it
    await driver.close()
})

app.get('/users/:userID/followers', jsonParser, async (req, res, next) => {
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
    const session = driver.session()

    const userID = req.params.userID

    try {

        const readQuery = `MATCH (u1:User)-[:Follows]->(u2:User) WHERE u2.id = '${userID}' RETURN u1.id, u1.handle, u1.avatarVal`
        const readResult = await session.readTransaction(tx =>
            tx.run(readQuery, {})
        )
        var usersFollowed = [];
        readResult.records.forEach(record => {
            let id = record.get('u1.id')
            let handle = record.get('u1.handle')
            let avatarVal = record.get('u1.avatarVal')
            let miniProfile = new MiniProfile(id, handle, avatarVal)
            usersFollowed.push(miniProfile)
        })
        res.send({ "response": usersFollowed })
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session.close()
    }

    // Don't forget to close the driver connection when you're finished with it
    await driver.close()
})

app.get('/users/:userID/followed-user/:followeeID', jsonParser, async (req, res, next) => {
    if (req.params.userID) {
        if (req.params.followeeID) {
            let followerID = req.params.userID
            let followeeID = req.params.followeeID

            const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
            const session = driver.session();

            try {
                const writeQuery =
                    `MATCH (u1:User),(u2:User)
                WHERE u1.id = \"${followerID}\" AND u2.id = \"${followeeID}\"
                MERGE (u1)-[r:Follows]->(u2)
                RETURN r`

                const writeResult = await session.writeTransaction(tx =>
                    tx.run(writeQuery, {})
                )

            } catch (error) {
                console.error('Something went wrong: ', error)
                res.send(error)
            } finally {
                var result = { "response": "Success!" }
                res.send(result)
                await session.close()
            }

            await driver.close()

        } else {
            res.send("Missing time field");
        }
    } else {
        res.send("Missing userID field");
    }
})

app.get('/users/:userID/unfollowed-user/:followeeID', jsonParser, async (req, res, next) => {
    if (req.params.userID) {
        if (req.body.gameID) {
            let userID = req.params.userID
            let followeeID = req.params.followeeID

            const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
            const session = driver.session();

            try {
                const writeQuery =
                    `MATCH (u1:User { id: '${userID}' })-[r:Follows]->(u2:User {id: '${followeeID}'}) DELETE r`

                const writeResult = await session.writeTransaction(tx =>
                    tx.run(writeQuery, {})
                )

            } catch (error) {
                console.error('Something went wrong: ', error)
                res.send(error)
            } finally {
                var result = { "response": "Success!" }
                res.send(result)
                await session.close()
            }

            await driver.close()

        } else {
            res.send("Missing time field");
        }
    } else {
        res.send("Missing userID field");
    }
})

app.get('/posts/game/:gameID', jsonParser, async (req, res, next) => {
    var gameID = req.params.gameID

    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
    const session = driver.session()

    try {

        const readQuery = `MATCH (p:Post)-[:PostOf]->(g:Game) WHERE g.id = '${gameID}' RETURN p ORDER BY p.time DESC`
        const readResult = await session.readTransaction(tx =>
            tx.run(readQuery, {})
        )
        var posts = [];
        readResult.records.forEach(record => {
            var post = (record.get('p'))
            var returnPost = new Post(post.properties.text, post.properties.numUpvotes.low, post.properties.imageURL, post.properties.imagePath, post.properties.time, post.properties.id, new MiniProfile(post.properties.userID, post.properties.handle, post.properties.avatarVal), new MiniGame(post.properties.gameID, post.properties.rating, post.properties.coverURL, post.properties.gameName))
            var found = false 
            posts.forEach( post=> {
                if(post.id == returnPost.id) {
                    found = true
                }
            })
            
            if(!found){
                posts.push(returnPost)
            }
        })
        res.send({ "response": posts })
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session.close()
    }

    // Don't forget to close the driver connection when you're finished with it
    await driver.close()
})

app.get('/posts', jsonParser, async (req, res, next) => {

    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
    const session = driver.session()

    try {

        const readQuery = `MATCH (p:Post)-[:PostOf]->(g:Game) RETURN p ORDER BY p.time DESC`
        const readResult = await session.readTransaction(tx =>
            tx.run(readQuery, {})
        )
        var posts = [];
        readResult.records.forEach(record => {
            var post = (record.get('p'))
            var returnPost = new Post(post.properties.text, post.properties.numUpvotes.low, post.properties.imageURL, post.properties.imagePath, post.properties.time, post.properties.id, new MiniProfile(post.properties.userID, post.properties.handle, post.properties.avatarVal), new MiniGame(post.properties.gameID, post.properties.rating, post.properties.coverURL, post.properties.gameName))
            var found = false
            posts.forEach( post=> {
                if(post.id == returnPost.id) {
                    found = true
                }
            })
            
            if(!found){
                posts.push(returnPost)
            }
        })
        res.send({ "response": posts })
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session.close()
    }

    // Don't forget to close the driver connection when you're finished with it
    await driver.close()
})

app.get('/posts/user/:userID', jsonParser, async (req, res, next) => {
    var userID = req.params.userID

    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
    const session = driver.session()

    try {

        const readQuery = `MATCH (u:User)-[:Posted]->(p:Post)-[:PostOf]->(g:Game) WHERE u.id = '${userID}' RETURN p ORDER BY p.time DESC`
        const readResult = await session.readTransaction(tx =>
            tx.run(readQuery, {})
        )
        var posts = [];
        readResult.records.forEach(record => {
            var post = (record.get('p'))
            var returnPost = new Post(post.properties.text, post.properties.numUpvotes.low, post.properties.imageURL, post.properties.imagePath, post.properties.time, post.properties.id, new MiniProfile(post.properties.userID, post.properties.handle, post.properties.avatarVal), new MiniGame(post.properties.gameID, post.properties.rating, post.properties.coverURL, post.properties.gameName))
            var found = false
            posts.forEach( post=> {
                if(post.id == returnPost.id) {
                    found = true
                }
            })
            
            if(!found){
                posts.push(returnPost)
            }
        })
        res.send({ "response": posts })
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session.close()
    }

    // Don't forget to close the driver connection when you're finished with it
    await driver.close()
})

app.get('/posts/personalized/:userID', jsonParser, async (req, res, next) => {
    var userID = req.params.userID

    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
    const session = driver.session()
    var posts = [];

    try {

        const readQuery = `MATCH (u1:User)-[r1:Follows]->(u2:User)-[r2:Posted]->(p:Post)-[r3:PostOf]->(g:Game) WHERE u2.id = '${userID}' RETURN p`
        const readResult = await session.readTransaction(tx =>
            tx.run(readQuery, {})
        )

        readResult.records.forEach(record => {
            var post = (record.get('p'))
            var returnPost = new Post(post.properties.text, post.properties.numUpvotes.low, post.properties.imageURL, post.properties.imagePath, post.properties.time, post.properties.id, new MiniProfile(post.properties.userID, post.properties.handle, post.properties.avatarVal), new MiniGame(post.properties.gameID, post.properties.rating, post.properties.coverURL, post.properties.gameName))
            var found = false
            posts.forEach( post=> {
                if(post.id == returnPost.id) {
                    found = true
                }
            })
            
            if(!found){
                posts.push(returnPost)
            }
        })
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session.close()
    }

    const session2 = driver.session()
    var gameID = ''
    try {

        const readQuery = `MATCH (u:User)-[r1:Follows]->(g:Game) WHERE u.id = '${userID}' RETURN g.id`
        const readResult = await session2.readTransaction(tx =>
            tx.run(readQuery, {})
        )
        readResult.records.forEach(record => {
            gameID = record.get('g.id')
        })
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session2.close()
    }

    const session3 = driver.session()

    try {

        const readQuery = `MATCH (p:Post)-[r:PostOf]->(g:Game) WHERE g.id = '${gameID}' RETURN p`
        const readResult = await session3.readTransaction(tx =>
            tx.run(readQuery, {})
        )
        readResult.records.forEach(record => {
            var post = (record.get('p'))
            var returnPost = new Post(post.properties.text, post.properties.numUpvotes.low, post.properties.imageURL, post.properties.imagePath, post.properties.time, post.properties.id, new MiniProfile(post.properties.userID, post.properties.handle, post.properties.avatarVal), new MiniGame(post.properties.gameID, post.properties.rating, post.properties.coverURL, post.properties.gameName))
            posts.forEach( post=> {
                if(post.id == returnPost.id) {
                    found = true
                }
            })
            
            if(!found){
                posts.push(returnPost)
            }
        })
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session3.close()
    }

    const session4 = driver.session()

    try {

        const readQuery = `MATCH (u1:User)-[r1:Posted]->(p:Post)-[r2:PostOf]->(g:Game) WHERE u1.id = '${userID}' RETURN p`
        const readResult = await session4.readTransaction(tx =>
            tx.run(readQuery, {})
        )

        readResult.records.forEach(record => {
            var post = (record.get('p'))
            var returnPost = new Post(post.properties.text, post.properties.numUpvotes.low, post.properties.imageURL, post.properties.imagePath, post.properties.time, post.properties.id, new MiniProfile(post.properties.userID, post.properties.handle, post.properties.avatarVal), new MiniGame(post.properties.gameID, post.properties.rating, post.properties.coverURL, post.properties.gameName))
            posts.forEach( post=> {
                if(post.id == returnPost.id) {
                    found = true
                }
            })
            
            if(!found){
                posts.push(returnPost)
            }
        })
        res.send({ "response": posts.sort((a, b) => b.time - a.time) })
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session4.close()
    }

    // Don't forget to close the driver connection when you're finished with it
    await driver.close()
})

app.get('/posts/comments/:parentID', jsonParser, async (req, res, next) => {
    var parentID = req.params.parentID

    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
    const session = driver.session()

    try {

        const readQuery = `MATCH (p1:Post)-[:CommentOf]->(p2:Post) WHERE p2.id = '${parentID}' RETURN p1`
        const readResult = await session.readTransaction(tx =>
            tx.run(readQuery, {})
        )
        var posts = [];
        readResult.records.forEach(record => {
            var post = (record.get('p1'))
            var returnPost = new Post(post.properties.text, post.numUpvotes, post.properties.imageURL, post.properties.imagePath, post.properties.time, post.properties.id, new MiniProfile(post.properties.userID, post.properties.handle, post.properties.avatarVal), new MiniGame(post.properties.gameID, post.properties.rating, post.properties.coverURL, post.properties.gameName))
            var found = false
            posts.forEach( post=> {
                if(post.id == returnPost.id) {
                    found = true
                }
            })
            
            if(!found){
                posts.push(returnPost)
            }
        })
        res.send({ "response": posts.sort((a, b) => a.time - b.time) })
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session.close()
    }

    // Don't forget to close the driver connection when you're finished with it
    await driver.close()
})

app.post('/user/:userID/update-ping', jsonParser, async (req, res, next) => {
    if (req.params.userID) {
        if (req.body.ping) {
            let userID = req.params.userID
            let ping = req.body.ping

            const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
            const session2 = driver.session();

            try {
                const writeQuery =
                    `MATCH (u:User { id: '${userID}' }) SET u.ping = ${ping}
                RETURN u`

                const writeResult = await session2.writeTransaction(tx =>
                    tx.run(writeQuery, {})
                )

            } catch (error) {
                console.log(error)
                var result = { "response": "Unknown Error Occurred" }
                res.send(result)
            } finally {
                var result = { "response": "Success!" }
                res.send(result)
                await session2.close()
            }

            driver.close()
        } else {
            res.send({ "resposne": "Please include the ping field" })
        }
    } else {
        res.send({ "resposne": "Please include the userID field" })
    }

})

app.get('/map/points', jsonParser, async (req, res, next) => {
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
    const session = driver.session()

    try {

        const readQuery = `MATCH (u:User) RETURN u`
        const readResult = await session.readTransaction(tx =>
            tx.run(readQuery, {})
        )
        var mapObjects = [];
        readResult.records.forEach(record => {
            var user = (record.get('u'))
            if (user.properties.latitude != 0.0 && user.properties.longitude != 0.0){
                var returnObject = new MapObject(user.properties.latitude, user.properties.longitude, user.properties.ping)
                mapObjects.push(returnObject)
            }
        })
        res.send({ "response": mapObjects })
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session.close()
    }

    // Don't forget to close the driver connection when you're finished with it
    await driver.close()
})

app.listen(port, () => {
    console.log("Server live @ http://localhost:" + port);
})

class MiniGame {
    constructor(id, rating, coverURL, name) {
        this.name = name;
        this.coverURL = coverURL;
        this.id = id;
        this.rating = rating;
    }
}

class MiniProfile {
    constructor(id, handle, avatarVal) {
        this.handle = handle;
        this.avatarVal = avatarVal;
        this.id = id;
    }
}

class Post {
    constructor(text, numUpvotes, imageURL, imagePath, time, id, user, game) {
        this.text = text;
        this.numUpvotes = numUpvotes;
        this.imageURL = imageURL;
        this.imagePath = imagePath;
        this.time = time;
        this.id = id;
        this.user = user;
        this.game = game;
    }
}

class MapObject {
    constructor(latitude, longitude, ping) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.ping = ping;
    }
}

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const neo4j = require('neo4j-driver');
const { v4: uuidv4 } = require('uuid');
const fs = require("fs");

const uri = 'neo4j+s://6353106d.databases.neo4j.io'
const json = JSON.parse(fs.readFileSync('secrets.json'))
const user = json.username;
const password = json.password;

var app = express();
const port = process.env.PORT || 9000;
var jsonParser = bodyParser.json()

app.use(cors());

app.get('/', (req, res) => {
   res.send('Hello World!')
})

app.post('/user/:userID', jsonParser, async (req,res) => {
    if(req.params.userID || req.params.userName == "") {
        if(req.body.handle || req.body.handle == "") {
            if(req.body.firstName || req.body.firstName == "") {
                if(req.body.lastName || req.body.lastName == "") {
                    if(req.body.screenNames || req.body.screenNames == "") {
                        if(req.body.ping || req.body.ping == 0) {
                            if(req.body.latitude || req.body.latitude == 0) {
                                if(req.body.longitude || req.body.longitude == 0) {
                                    if(req.body.avatarVal || req.body.avatarVal == 0) {
                                        let userID = req.params.userID
                                        let handle = req.body.handle
                                        let firstName = req.body.firstName
                                        let lastName = req.body.lastName
                                        let screenNames = req.body.screenNames
                                        let ping = req.body.ping
                                        let latitude = req.body.latitude
                                        let longitude = req.body.longitude
                                        let avatarVal = req.body.avatarVal
                        
                                        const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
                                        const session = driver.session();
                        
                                        try {
                                            const writeQuery = `MERGE (u1:User { id: $userID, handle: $handle, firstName: $firstName, lastName: $lastName, screenNames: $screenNames, ping: $ping, latitude: $latitude, longitude: $longitude, avatarVal: $avatarVal })
                                                                RETURN u1`
                                            
                                            const writeResult = await session.writeTransaction(tx =>
                                                tx.run(writeQuery, { userID, handle, firstName, lastName, screenNames, ping, latitude, longitude, avatarVal })
                                            )
                                                
                                        } catch (error) {
                                            var result = {"response": "Unknown error"}
                                            res.send(result)
                                        } finally {
                                            var result = {"response": "Success!"}
                                            res.send(result)
                                            await session.close()
                                        }
                        
                                        await driver.close()
                                    } else {
                                        var result = {"response": "Missing avatarVal field"}
                                        res.send(result)
                                    }
                                } else {
                                    var result = {"response": "Missing longitude field"}
                                    res.send(result)
                                }
                            } else {
                                var result = {"response": "Missing latitude field"}
                                res.send(result)
                            }
                        } else {
                            var result = {"response": "Missing ping field"}
                            res.send(result)
                        }
                    } else {
                        var result = {"response": "Missing screenNames field"}
                        res.send(result)
                    }
                } else {
                    var result = {"response": "Missing lastName field"}
                    res.send(result)
                }
            } else {
                var result = {"response": "Missing firstName field"}
                res.send(result)
            }
        } else {
            var result = {"response": "Missing handle field"}
            res.send(result)
        }
    } else {
        var result = {"response": "Missing userKD field"}
        res.send(result)
    }
})

app.get('/user/:userID', jsonParser, async(req, res) => {
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
            console.log(typeof record.get('u'))
            users.push(record.get('u'))
        })
        if(users.length > 0) {

            let response = {"response": users[0]}
            res.send(response)
        } else {
            let response = {"response": "No users found"}
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

app.get('/usernames/:username', jsonParser, async(req, res) => {
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
    const session = driver.session()

    const username = req.params.username

    try {

        const readQuery = `match (u:User) where u.handle = "${username.toString()}" return u`
        const readResult = await session.readTransaction(tx =>
            tx.run(readQuery, {})
        )
        

        if (readResult.records.length == 0) {
            var result = {"response": "No users with this name."}
            res.send(result)
        } else {
            var result = {"response": "This username is already taken."}
            res.send(result)
        }
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session.close()
    }

    // Don't forget to close the driver connection when you're finished with it
    await driver.close()
})

app.get('/username/:username', jsonParser, async(req, res) => {
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
            console.log(typeof record.get('u'))
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

app.post('/game/:gameID', jsonParser, async (req,res) => {
    if(req.params.gameID || req.params.gameID == "") {
        if(req.body.description || req.body.description == "") {
            if(req.body.name || req.body.name == "") {
                if(req.body.ageRatings || req.body.ageRatings == "") {
                    if(req.body.videos || req.body.videos == [] || req.body.videos == "") {
                        if(req.body.coverURL || req.body.coverURL == "") {
                            if(req.body.firstReleaseDate || req.body.firstReleaseDate == 0) {
                                if(req.body.franchise || req.body.franchise == "") {
                                    if (req.body.genres || req.body.firstName == []) {
                                        if(req.body.platforms || req.body.firstName == []) {
                                            if(req.body.rating || req.body.rating == 0) {
                                                if(req.body.ratingCount || req.body.ratingCount == 0) {
                                                    if(req.body.screenshots || req.body.firstName == []) {
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
                                                            const writeQuery = `CREATE (g:Game { id: $gameID, description: $description, name: $name, ageRatings: $ageRatings, videos: $videos, coverURL: $coverURL, firstReleaseDate: $firstReleaseDate, franchise: $franchise, genres: $genres, platforms: $platforms, rating: $rating, ratingCount: $ratingCount, screenshots: $screenshots })
                                                                                RETURN g`
                                                            
                                                            const writeResult = await session.writeTransaction(tx =>
                                                                tx.run(writeQuery, { gameID, description, name, ageRatings, videos, coverURL, firstReleaseDate, franchise, genres, platforms, rating, ratingCount, screenshots })
                                                            )
                                                                
                                                        } catch (error) {
                                                            console.error('Something went wrong: ', error)
                                                        } finally {
                                                            var result = {"response": "Success!"}
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

app.post('/report-issue', jsonParser, async (req,res) => {
    if(req.body.userID || req.body.userID == "") {
        if(req.body.time || req.body.time == 0) {
            if(req.body.text || req.body.text == "") {
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
                        tx.run(writeQuery, { reportID, time, reportText})
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
                    var result = {"response": "Success!"}
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

app.post('/post/:postID', jsonParser, (req,res) => {
    if(req.params.postID || req.params.postID == "") {
        if(req.body.time || req.body.time == 0) {
            if(req.body.text || req.body.text == "") {
                if(req.body.userID || req.body.userID == "") {
                    if(req.body.postType || req.body.postType == "") {
                        if(req.body.gameID || req.body.gameID == "") {
                            if(req.body.content || req.body.content == "") {
                                //Add in a check for url, but it does not necessarily need to be here
                                if(req.body.isComment) {
                                    if (req.body.parentPostID) {
                                        // Add as a comment




                                    } else { 
                                        res.sendStatus("Missing missing parentPostID field")
                                    }
                                } else {
                                    // Make standalone post



                                    
                                }
                            } else {
                                res.sendStatus("Missing content field")
                            }
                        } else {
                            res.sendStatus("Missing channelID field")
                        }
                    } else {
                        res.sendStatus("Missing postType field")
                    }
                } else {
                    res.sendStatus("Missing userID field")
                }
            } else {
                res.send("Missing text field");
            }
        } else {
            res.send("Missing time field");
        }
    } else {
        res.send("Missing postID field");
    }
})

app.post('/users/:userID/upvoted-post', jsonParser, (req,res) => {
    if(req.params.userID || req.params.userID == "") {
        if(req.body.postID || req.body.postID == "") {
            if(req.body.text || req.body.text == "") {
                
            //TODO

            }
        } else {
            res.send("Missing postID field");
        }
    } else {
        res.send("Missing userID field");
    }
})

app.post('/users/:userID/followed-game', jsonParser, async (req,res) => {
    if(req.params.userID || req.params.userID == "") {
        if(req.body.gameID || req.body.gameID == "") {
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
                var result = {"response": "Success!"}
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

app.post('/users/:userID/unfollowed-game', jsonParser, async (req,res) => {
    if(req.params.userID || req.params.userID == "") {
        if(req.body.gameID || req.body.gameID == "") {
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
                var result = {"response": "Success!"}
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

app.post('/users/:userID/rated-game', jsonParser, async (req,res) => {
    if(req.params.userID || req.params.userID == "") {
        if(req.body.gameID || req.body.gameID == "") {
            if(req.body.rating) {

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
                    
                    let oldTotalRating = ratings[0] * ratingCounts[0]
                    newRating = oldTotalRating + rating
                    newRatingCount = ratingCounts[0] + 1
                } catch (error) {
                    console.error('Something went wrong: ', error)
                } finally {
                    await session.close()
                }




                const session2 = driver.session();

                try {
                    const writeQuery = 
                    `MATCH (g:Game { id: '${gameID}' }) SET g.rating = ${newRating}
                    RETURN g`
                       
                    const writeResult = await session2.writeTransaction(tx =>
                        tx.run(writeQuery, {})
                    )
                        
                } catch (error) {
                    var result = {"response": "Unknown Error Occurred"}
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
                    var result = {"response": "Unknown Error Occurred"}
                    res.send(result)
                } finally {
                    var result = {"newRating": newRating}
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

app.get('/users/:userID/games-followed', jsonParser, async (req,res) => {
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
        res.send({"response": gamesFollowed})
    } catch (error) {
        console.error('Something went wrong: ', error)
    } finally {
        await session.close()
    }

    // Don't forget to close the driver connection when you're finished with it
    await driver.close()
})

app.get('/users/:userID/following', jsonParser, async (req,res) => {
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
        res.send({"response": usersFollowed})
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

const express = require("express");

const jwt = require("jsonwebtoken");

const axios = require("axios");

const cors = require("cors");

const querystring = require("querystring");

const cookieparser = require("cookie-parser");

const path = require("path");

const multer = require("multer");

const fs = require("fs").promises

const port = 8080

const app = express();

const redirectURI = "auth/google"; 

app.set("view engine", "ejs")
app.set("views", path.resolve("./views"));


app.get('/', (req,res) => {
    res.render("pages/index")
});

app.get('/profile', (req,res) => {
    res.render("pages/profile")
});



app.use(
    cors({
        origin: 'http:/localhost:8080',
        Credentials: true,
    })
);

app.use(cookieparser());



function getGoogleAuthURL() {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
        redirect_uri: `http://localhost:8080/${redirectURI}`,
        client_id: '969383132502-ljsl5uhjeu2c6gncjvgte5095kkkkrt1.apps.googleusercontent.com',
        access_type: "offline",
        response_type: "code",
        prompt: "consent", 
        scope: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
        ].join(" "),
    };

    return `${rootUrl}?${querystring.stringify(options)}`;
}

function getTokens({
    code,
    clientId,
    clientSecret,
    redirectUri,
}) {
    const url = "https://oauth2.googleapis.com/token";
    const values = {
        code,
        client_id: '969383132502-ljsl5uhjeu2c6gncjvgte5095kkkkrt1.apps.googleusercontent.com',
        client_secret: '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',
        redirect_uri: "http://localhost:8080/auth/google",
        grant_type: "authorization_code",
    };

    return axios
     .post(url, querystring.stringify(values), {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
     })
     .then((res) => res.data)
     .catch((error) => {
        console.log(error)
        throw new Error(error.message);
     });
}





//getting the user from google with the code
app.get("/auth/google", async (req, res) => {
    const code = req.query.code;

    const { id_tokens, access_token } = await getTokens({
        code,
        clientId: '969383132502-ljsl5uhjeu2c6gncjvgte5095kkkkrt1.apps.googleusercontent.com',
        clientSecret: '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',
        redirectUri: `http://localhost:8080/auth/google`,
    });

    // fetch the user profile with access token and bearer

    const googleUser = await axios
     .get(
        `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
        {
            headers: {
                Authorization: `Bearer ${id_tokens}`,
            },
        }
     )
     .then((res) => res.data)
     .catch((error) => {
        console.log(error)
        throw new Error(error.message);
     });

     const token = jwt.sign(googleUser, "JWT_SECRET_ashdsh");

     res.cookie("myAuthCookie", token, {
        maxAge: 90000000,
        httpOnly: true,
        secure: false,
     });

     res.redirect("/profile");
});


//getting the current user
app.get("/auth/me", (req, res) => {
    try {
        const decoded = jwt.verify(req.cookies["myAuthCookie"], "JWT_SECRET_ashdsh");
        return res.send(decoded);
    } catch (err) {
        res.send(null);
    }
});


app.get("/auth/google/url", (req,res) => {
    return res.redirect(getGoogleAuthURL());
});


function main() {
    app.listen(port, () => {
        console.log(`App listening http://localhost:${port}`)
    })
}

main()


//new script



//const PORT = 8000;

const storage = multer.diskStorage({ 
    destination: function (req, file, cb) {
        return cb(null, "./uploads");
    },
    filename: function (req, file, cb) {
        return cb(null, `${new Date().toISOString().replace(/:/g, '-')}-${file.originalname}`);
    },
});

const upload = multer({ storage });



app.use(express.urlencoded({ extended: false}));

app.get("/", (req, res) => {
    return res.render("homepage");
});

app.get("/get-files", async (req, res) => {

    const filesList = await fs.readdir('uploads/', {  withFileTypes: true })
    const newFilesList = []
    for(let i=0;i<filesList.length;i++) {
        newFilesList.push(filesList[i].name)
    }

    return res.json(newFilesList);
});

app.get("/download/:fileName", (req, res) => {
    return res.download(`./uploads/${req.params.fileName}`);
});

app.post("/upload", upload.single("profileImage"), (req, res) => {
    console.log(req.body);
    console.log(req.file);

    return res.redirect("/profile");
});

app.get("/logout", (req, res) => {
    res.render("pages/logout")
});
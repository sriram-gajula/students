const express = require('express')
const multer = require('multer')
const bcrypt = require('bcryptjs')
const app = express()
const port = 3000
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore} = require('firebase-admin/firestore');
var serviceAccount = require("./key.json");
initializeApp({
credential: cert(serviceAccount)
});
const db = getFirestore();

app.use(express.static('public'));

//setting view engine to ejs
app.set("view engine", "ejs");

app.get('/signup', (req, res) => {
  res.render('signup')
})

app.use(express.urlencoded({ extended: true }));

// Handle signup using POST method
app.post('/signupsubmit', async (req, res) => {
    try {
      const user_name = req.body.user_name;
      const email = req.body.email;
      const password = req.body.password;
  
      // Hash the password before saving it
      const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds
  
      // Add user data to Firestore
      db.collection('users info')
        .add({
          userId: user_name,
          email: email,
          Password: hashedPassword, // Save the hashed password
        })
        .then(() => {
          res.render('login');
        });
    } catch (error) {
      console.error('Signup Error:', error);
      res.send('Signup Error');
    }
  });



// Handle login using GET method (not recommended)
app.get('/loginsubmit', async (req, res) => {
    try {
        const email = req.query.email;
        const password = req.query.password;
    
        // Retrieve user data from Firestore by email
        const userQuerySnapshot = await db.collection('users info')
            .where("email", "==", email)
            .get();
    
        if (userQuerySnapshot.empty) {
            res.send("Login Failed");
            return;
        }
    
        // Get the user document
        const userDoc = userQuerySnapshot.docs[0];
    
        // Compare the provided password with the hashed password from Firestore
        const hashedPassword = userDoc.data().Password;
        const passwordMatch = await bcrypt.compare(password, hashedPassword);
    
        if (passwordMatch) {
            res.render("home");
        } else {
            res.send("Login Failed");
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.send('Login Error');
    }
});


// ROUTES 
app.get('/project', (req, res) => {
  res.render('project'); // Renders the 'project.ejs' template
});

app.get('/video', (req, res) => {
    res.render('video'); // Renders the 'video.ejs' template
});
app.get('/feedback',(req,res)=>{
    res.render('feedback')
})
app.get('/login', (req, res) => {
    res.redirect('login')
})
app.get('/home', (req, res) => {
    res.render('home')
})
app.get('/contest', (req, res) => {
    res.render('contest')
})
app.get('/sample', (req, res) => {
    res.render('sample')
})
app.get('/home/contest', (req, res) => {
    res.render('contest')
  })

//blogs folder handing code 
app.get('/blogsubmit', (req, res) => {
    const title = req.query.title;
    const content = req.query.content;
    const imageBase64 = req.query.image; // Base64-encoded image

    // Convert the Base64 image string to a buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Save the title, content, and image to the Firestore collection
    db.collection('blogs').add({
        Title: title,
        Content: content,
        Image: imageBuffer, // Save the image as a buffer
    }).then(() => {
        // Redirect to the /blogs route after successful submission
        res.redirect('/home/contest/blogs');
    }).catch((error) => {
        console.error('Error submitting blog:', error);
        res.send("Error submitting blog");
    });
});

// ...


// Set up multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));


app.get('/home/contest/blogs', (req, res) => {
    // Query Firestore to retrieve the blogs
    db.collection('blogs')
      .get()
      .then((snapshot) => {
        const blogs = [];
        snapshot.forEach((doc) => {
          const blogData = doc.data();
          // Push the blog data into the blogs array
          blogs.push(blogData);
        });
        // Render a view to display the blogs
        res.render('blogs', { blogs });
      })
      .catch((error) => {
        console.error('Error retrieving blogs:', error);
        res.send('Error retrieving blogs');
      });
  });
  


// project handler 

// Handle the form submission to add a new project
app.post('/project', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
    try {
      // Extract project data from the request body
      const { title, description } = req.body;
  
      // Get the uploaded files from the request
      const imageFile = req.files['image'][0];
      const videoFile = req.files['video'][0];
  
      // Create references to Firestore for image and video
      const imageRef = db.collection('projects').doc().collection('images').doc();
      const videoRef = db.collection('projects').doc().collection('videos').doc();
  
      // Upload the files to Firestore
      await Promise.all([
        imageRef.set({ image: imageFile.buffer }),
        videoRef.set({ video: videoFile.buffer }),
      ]);
  
      // Get the download URLs for the uploaded files
      const imageDownloadURL = await imageRef.getDownloadURL();
      const videoDownloadURL = await videoRef.getDownloadURL();
  
      // Add the project data to Firestore
      const projectRef = db.collection('projects').doc();
      await projectRef.set({
        title,
        description,
        imageUrl: imageDownloadURL,
        videoUrl: videoDownloadURL,
      });
  
      console.log('Project added with ID: ', projectRef.id);
  
      // Redirect back to the project page
      res.redirect('/project');
    } catch (error) {
      console.error('Error adding project:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  

  
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
console.log("🚀 Testing startup...");
console.log("Node version:", process.version);
console.log("Current directory:", process.cwd());

const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Hello! Rivic Q-Runtime is working!');
});

const port = 3001;
app.listen(port, () => {
    console.log(`✅ Test server running at http://localhost:${port}`);
    console.log("If you can see this message, the basic setup is working!");
});

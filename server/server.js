const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Chatkit = require('@pusher/chatkit-server');

const app = express();
const instance_locator_id = '54a480d4-3b3c-44ce-bd15-6584ec83cc80';
const chatkit_secret = 'dc61107e-6e27-4282-8fac-73db559829cc:/UM7P8l/EfOVmzqvR9f2w84FCsRWaJzoABUCgAva6Lk=';

const chatkit = new Chatkit.default({
  instanceLocator: `v1:us1:${instance_locator_id}`,
  key: chatkit_secret,
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('all green!');
});

app.post('/users', (req, res) => {
  const { username } = req.body;
  
  chatkit
    .createUser({ 
      id: username, 
      name: username 
    })
    .then(() => {
      res.sendStatus(201);
    })
    .catch((error) => {
      if(error.error === 'services/chatkit/user_already_exists'){
        res.sendStatus(200);
      }else{
        let statusCode = error.status;
        if(statusCode >= 100 && statusCode < 600){
          res.status(statusCode);        
        }else{
          res.status(500);
        }
      }
    });
});


const PORT = 3000;
app.listen(PORT, (err) => {
  if(err){
    console.error(err);
  }else{
    console.log(`Running on ports ${PORT}`);
  }
});
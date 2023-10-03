const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const mongoose = require('mongoose');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.set('view engine', 'ejs')

mongoose.connect('mongodb+srv://ayyappa:au123456@cluster0.ltwd083.mongodb.net/Weather-App', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // tlsAllowInvalidCertificates: true
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
});

const weatherSchema = new mongoose.Schema({
    city: String,
    description: String,
    temperature: String,
    humidity: Number,
    windSpeed: Number,
    forecast: [{
      date: String,
      temperature: String,
    }],
  });

const contactSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String,
  });

const Weather = mongoose.model('Weather', weatherSchema);
const Contact = mongoose.model('Contact', contactSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/weather', (req, res) => {
    const city = req.body.city;
    const weatherUrl = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=b311db7788630d973dd696d130f5cba4`;
    const forecastUrl = `http://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=b311db7788630d973dd696d130f5cba4`;
  
    request(weatherUrl, (error, response, body) => {
      if (error) {
        res.status(500).send('Error getting weather data');
      } else {
        const data = JSON.parse(body);
        const weather = new Weather({
          city: req.body.city,
          description: data.weather[0].description,
          temperature: (data.main.temp - 273.15).toFixed(2) + '°C',
          humidity: data.main.humidity,
          windSpeed: data.wind.speed,
        });
  
        request(forecastUrl, (error, response, body) => {
          if (error) {
            res.status(500).send('Error getting forecast data');
          } else {
            const data = JSON.parse(body);
            const forecast = data.list.filter((item) => {
              return item.dt_txt.includes('12:00:00');
            }).slice(0, 3).map((item) => {
              return {
                date: item.dt_txt.split(' ')[0],
                temperature: (item.main.temp - 273.15).toFixed(2) + '°C',
              };
            });
  
            weather.forecast = forecast;
  
            weather.save()
              .then(() => {
                console.log('Weather data saved to MongoDB');
                res.json(weather);
              })
              .catch((err) => {
                console.error('Failed to save weather data to MongoDB:', err);
                res.status(500).send('Error saving weather data');
              });
          }
        });
      }
    });
  });



app.post('/contact', (req, res) => {
    const contact = new Contact({
      name: req.body.name,
      email: req.body.email,
      message: req.body.message,
    });
  
    contact.save()
      .then(() => {
        console.log('Contact form data saved to MongoDB');
        res.redirect('/thank-you.html');
      })
      .catch((err) => {
        console.error('Failed to save contact form data to MongoDB:', err);
        res.status(500).send('Error saving contact form data');
      });
  });


  app.get('/contacts', (req, res) => {
    Contact.find().sort({ _id: -1 }).limit(6)
      .then((contacts) => {
        res.render('contacts', { contacts });
      })
      .catch((err) => {
        console.error('Failed to retrieve contact data from MongoDB:', err);
        res.status(500).send('Error retrieving contact data');
      });
  });



const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
import http from 'http';

const url = 'http://127.0.0.1:8085/tests/models/CounterModel.mjs';

http.get(url, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  res.resume();
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});

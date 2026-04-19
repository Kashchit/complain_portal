const clients = new Set();

const addClient = (res) => {
  clients.add(res);
};

const removeClient = (res) => {
  clients.delete(res);
};

const broadcast = (event, data) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
};

module.exports = {
  addClient,
  removeClient,
  broadcast
};

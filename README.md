# Longcat API

## Dependencies
### Redis
```
# Install redis
brew install redis

# Start redis as a macOS service (auto-starts on machine reboot)
brew services start redis

# Alternatively, start local instance of redis in the background just once
redis-server &
```

### Mongo
```
# Tap the official mongo package
brew tap mongodb/brew

# Install mongodb-community package
brew install mongodb-community

# Start mongo as a macOS service (auto-starts on machine reboot)
brew services start mongodb-community
```

### Environment
- An environment file is required for any environment specified when running `npm start`, e.g., `npm start development`
- Ask another developer for a valid environment file to get started
- Environment files live in the `environment/` directory, e.g., `environment/development.js`
- The default environment if not specified in `npm start` is `development`

### Almacen API
Certain endpoints in Longcat API depend on an instance of Almacen API to make requests to.
For local development, you can either connect to the staging Almacen API or a locally hosted instance of Almacen API.
You can specify which instance of Almacen API to connect to inside your active environment file.

## Connecting to Longcat API
### Front-end site (e.g., Longcat UX)
Local front-end sites connecting to a local Longcat API instance must have a port of `4200`, e.g., `ng serve --port 4200`

### Postman
To connect to the API using a tool like Postman, you can import the postman collection JSON file found at `documentation/assets/longcat_api.postman_collection.json`



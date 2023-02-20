const { request } = require('graphql-request');

const endpoint = 'http://localhost:8080/v1/graphql';

const query = `
  query GetUsers($offset: Int!, $limit: Int!) {
    user(offset: $offset, limit: $limit) {
      id
      first_name
      last_name
      gender
    }
  }
`;

const queryFilter = `query GetUser {
  user {
    id
    first_name
    gender
    last_name
    user_trackings {
      lat
      lng
    }
  }
}
`;

const variables = {
  offset: 0,
  limit: 10,
};

request(endpoint, query, variables).then((data) => {
  console.log(data);
});

request(endpoint, queryFilter).then((data) => {
  console.log('=====>',data)
})
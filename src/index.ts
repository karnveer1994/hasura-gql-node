import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { gql } from 'graphql-request';
import { client } from './client';
import { generateJWT } from './jwt';
import { arePointsNear } from './helper';
const app = express();
const port = process.env.PORT || 3000;

// Parse JSON in request bodies
app.use(express.json());

app.listen(port, () => {
  console.log(`Auth server running on port ${port}.`);
});

app.post('/auth/register', async (req: Request, res: Response) => {
  const { email, password, first_name, last_name, gender } = req.body as Record<
    string,
    string
  >;

  const { insert_user_one } = await client.request(
    gql`
      mutation registerUser($user: user_insert_input!) {
        insert_user_one(object: $user) {
          id
        }
      }
    `,
    {
      user: {
        email,
        password: await bcrypt.hash(password, 10),
        first_name,
        last_name,
        gender,
      },
    }
  );

  const { id: userId } = insert_user_one;

  res.send({
    token: generateJWT({
      defaultRole: 'user',
      allowedRoles: ['user'],
      otherClaims: {
        'X-Hasura-User-Id': userId,
      },
    }),
  });
});

app.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as Record<string, string>;

  let { user } = await client.request(
    gql`
      query getUserByEmail($email: String!) {
        user(where: { email: { _eq: $email } }) {
          id
          password
        }
      }
    `,
    {
      email,
    }
  );

  user = user[0];

  if (!user) {
    res.sendStatus(401);
    return;
  }

  // Check if password matches the hashed version
  const passwordMatch = await bcrypt.compare(password, user.password);

  if (passwordMatch) {
    res.send({
      token: generateJWT({
        defaultRole: 'user',
        allowedRoles: ['user'],
        otherClaims: {
          'X-Hasura-User-Id': user.id,
        },
      }),
    });
  } else {
    res.sendStatus(401);
  }
});

app.post('/auth/getUsers', async (req: Request, res: Response) => {
  // const offset = req?.body?.offset || 0;
  // const limit = req?.body?.offset || 10;
  let { user } = await client.request(
    gql`
      query GetUsers{
        user{
          id
          first_name
          last_name
          gender
        }
      }
    `
  );

  if (!user?.length) {
    res.sendStatus(401);
    return;
  }

  if (user?.length > 0) {
    res.send({
      token: generateJWT({
        defaultRole: 'user',
        allowedRoles: ['user'],
        otherClaims: {
          'X-Hasura-User-Id': user.id,
        },
      }),
      users: user,
    });
  } else {
    res.sendStatus(401);
  }
});

app.post('/auth/findusers', async (req: Request, res: Response) => {
  const { radius } = req.body;
  let { user } = await client.request(
    gql`
      query GetUser {
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
    `
  );

  if (!user?.length) {
    res.sendStatus(401);
    return;
  }

  if (user?.length > 0) {
    const getFilteredUsers = user?.filter((data: any, index: number) => {
      if (
        arePointsNear(
          data?.user_trackings[0],
          user[index]?.user_trackings[0],
          radius
        )
      )
        return user;
    });
    res.send({
      token: generateJWT({
        defaultRole: 'user',
        allowedRoles: ['user'],
        otherClaims: {
          'X-Hasura-User-Id': user.id,
        },
      }),
      users: getFilteredUsers,
    });
  } else {
    res.sendStatus(401);
  }
});

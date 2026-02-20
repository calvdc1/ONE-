import { createYoga, createSchema } from "graphql-yoga";

const typeDefs = /* GraphQL */ `
  type Query {
    health: String!
    me: User
    posts: [Post!]!
  }

  type User {
    id: ID!
    name: String!
    email: String!
  }

  type Post {
    id: ID!
    authorId: ID!
    content: String!
    createdAt: String!
  }
`;

const resolvers = {
  Query: {
    health: () => "ok",
    me: () => ({ id: "u1", name: "MSUan", email: "msuan@example.com" }),
    posts: () => [
      { id: "p1", authorId: "u1", content: "Hello ONE MSU!", createdAt: new Date().toISOString() },
    ],
  },
};

const schema = createSchema({ typeDefs, resolvers });

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/api/graphql",
});

export { yoga as GET, yoga as POST, yoga as OPTIONS };


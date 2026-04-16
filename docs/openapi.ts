const baseUrl = "http://localhost:3000";

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Next Terminal Chat API",
    version: "1.0.0",
    description:
      "OpenAPI specification for the Redis-backed chat, calling, profile, and admin endpoints used by the Next Terminal app.",
  },
  servers: [
    {
      url: baseUrl,
      description: "Local development",
    },
  ],
  tags: [
    { name: "Chat", description: "Join the room, read messages, and send messages." },
    { name: "Calls", description: "Create, join, poll, and signal WebRTC calls." },
    { name: "Profile", description: "Manage the signed-in chat user profile." },
    { name: "Admin", description: "Protected admin-only operations." },
  ],
  components: {
    securitySchemes: {
      chatSessionCookies: {
        type: "apiKey",
        in: "cookie",
        name: "next-terminal-chat-user-id",
        description:
          "Primary chat session cookie. The app also sets next-terminal-chat-user-name and both should be preserved by the client.",
      },
      adminSessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "next-terminal-admin",
        description: "Admin session cookie returned after a successful admin login.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "string",
          },
        },
        required: ["error"],
      },
      ChatUser: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
        },
        required: ["id", "name"],
      },
      PresenceUser: {
        type: "object",
        properties: {
          name: { type: "string" },
          online: { type: "boolean" },
        },
        required: ["name", "online"],
      },
      ChatMessage: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          text: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
          callMode: {
            type: "string",
            enum: ["audio", "video"],
          },
          type: {
            type: "string",
            enum: ["call_invite", "message", "system"],
          },
          userId: { type: "string" },
          callId: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          creatorId: { type: "string" },
          creatorName: { type: "string" },
          participantId: { type: "string" },
          participantName: { type: "string" },
          status: {
            type: "string",
            enum: ["pending", "active", "ended"],
          },
        },
        required: ["id", "name", "text", "timestamp", "type"],
      },
      CallState: {
        type: "object",
        properties: {
          callId: { type: "string", format: "uuid" },
          callMode: {
            type: "string",
            enum: ["audio", "video"],
          },
          createdAt: { type: "string", format: "date-time" },
          creatorId: { type: "string" },
          creatorName: { type: "string" },
          participantId: { type: ["string", "null"] },
          participantName: { type: ["string", "null"] },
          status: {
            type: "string",
            enum: ["pending", "active", "ended"],
          },
        },
        required: [
          "callId",
          "callMode",
          "createdAt",
          "creatorId",
          "creatorName",
          "participantId",
          "participantName",
          "status",
        ],
      },
      CallSignal: {
        type: "object",
        properties: {
          callId: { type: "string", format: "uuid" },
          fromUserId: { type: "string" },
          payload: {},
          signalType: {
            type: "string",
            enum: ["answer", "hangup", "ice-candidate", "offer"],
          },
        },
        required: ["callId", "fromUserId", "payload", "signalType"],
      },
    },
  },
  paths: {
    "/api/chat/join": {
      post: {
        tags: ["Chat"],
        summary: "Create or replace the current chat session",
        description:
          "Creates the chat session cookies and marks the user as present in Redis. Also writes a system join message.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    maxLength: 30,
                  },
                },
                required: ["name"],
              },
              example: {
                name: "Anand",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Joined successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    user: { $ref: "#/components/schemas/ChatUser" },
                  },
                  required: ["ok", "user"],
                },
              },
            },
          },
          "400": {
            description: "Invalid name",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/chat/messages": {
      get: {
        tags: ["Chat"],
        summary: "Fetch messages, current user, and user presence",
        description:
          "Returns the latest messages plus the current cookie-based session and all known users with online status.",
        responses: {
          "200": {
            description: "Messages fetched",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    messages: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ChatMessage" },
                    },
                    user: {
                      anyOf: [{ $ref: "#/components/schemas/ChatUser" }, { type: "null" }],
                    },
                    users: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PresenceUser" },
                    },
                  },
                  required: ["messages", "user", "users"],
                },
              },
            },
          },
        },
      },
    },
    "/api/chat/send": {
      post: {
        tags: ["Chat"],
        summary: "Send a chat message",
        security: [{ chatSessionCookies: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    maxLength: 500,
                  },
                },
                required: ["message"],
              },
              example: {
                message: "Hello from mobile",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Message stored",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                  },
                  required: ["ok"],
                },
              },
            },
          },
          "400": {
            description: "Missing message",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "No chat session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/call/request": {
      post: {
        tags: ["Calls"],
        summary: "Create a new audio or video call invite",
        security: [{ chatSessionCookies: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  mode: {
                    type: "string",
                    enum: ["audio", "video"],
                  },
                },
                required: ["mode"],
              },
              example: {
                mode: "audio",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Call invite created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    callId: { type: "string", format: "uuid" },
                    mode: {
                      type: "string",
                      enum: ["audio", "video"],
                    },
                  },
                  required: ["ok", "callId", "mode"],
                },
              },
            },
          },
          "401": {
            description: "No chat session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/call/join": {
      post: {
        tags: ["Calls"],
        summary: "Join an existing call invite",
        security: [{ chatSessionCookies: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  callId: { type: "string", format: "uuid" },
                },
                required: ["callId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Joined the call",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    state: { $ref: "#/components/schemas/CallState" },
                  },
                  required: ["ok", "state"],
                },
              },
            },
          },
          "400": {
            description: "Invalid call or already connected",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "No chat session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/call/poll": {
      get: {
        tags: ["Calls"],
        summary: "Poll call signals and current state",
        security: [{ chatSessionCookies: [] }],
        parameters: [
          {
            in: "query",
            name: "callId",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          "200": {
            description: "Pending signals for the current user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    signals: {
                      type: "array",
                      items: { $ref: "#/components/schemas/CallSignal" },
                    },
                    state: {
                      anyOf: [{ $ref: "#/components/schemas/CallState" }, { type: "null" }],
                    },
                  },
                  required: ["signals", "state"],
                },
              },
            },
          },
          "400": {
            description: "Missing call id",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "No chat session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/call/signal": {
      post: {
        tags: ["Calls"],
        summary: "Send a WebRTC signal to another user",
        security: [{ chatSessionCookies: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  callId: { type: "string", format: "uuid" },
                  targetUserId: { type: "string" },
                  signalType: {
                    type: "string",
                    enum: ["answer", "hangup", "ice-candidate", "offer"],
                  },
                  payload: {},
                },
                required: ["callId", "targetUserId", "signalType", "payload"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Signal queued",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                  },
                  required: ["ok"],
                },
              },
            },
          },
          "400": {
            description: "Invalid call signal",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "No chat session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/profile/delete": {
      post: {
        tags: ["Profile"],
        summary: "Delete the current user and their messages",
        security: [{ chatSessionCookies: [] }],
        responses: {
          "200": {
            description: "Profile deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                  },
                  required: ["ok"],
                },
              },
            },
          },
          "401": {
            description: "No chat session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/admin/auth": {
      post: {
        tags: ["Admin"],
        summary: "Create an admin session",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  password: { type: "string" },
                },
                required: ["password"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Admin authenticated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                  },
                  required: ["ok"],
                },
              },
            },
          },
          "401": {
            description: "Invalid password",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Admin"],
        summary: "Clear the current admin session",
        responses: {
          "200": {
            description: "Admin session cleared",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                  },
                  required: ["ok"],
                },
              },
            },
          },
        },
      },
    },
    "/api/admin/flush": {
      post: {
        tags: ["Admin"],
        summary: "Flush the entire Redis database",
        security: [{ adminSessionCookie: [] }],
        responses: {
          "200": {
            description: "Redis database cleared",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                  },
                  required: ["ok"],
                },
              },
            },
          },
          "401": {
            description: "Not authenticated as admin",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/admin/users": {
      delete: {
        tags: ["Admin"],
        summary: "Delete a user and their related data",
        security: [{ adminSessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                  },
                  required: ["ok"],
                },
              },
            },
          },
          "400": {
            description: "Invalid user name",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Not authenticated as admin",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const apiDocsSections = [
  {
    title: "Authentication",
    body: "The API currently uses HttpOnly cookies. Mobile clients should persist the Set-Cookie headers returned by /api/chat/join and /api/admin/auth and send those cookies back on later requests.",
  },
  {
    title: "OpenAPI JSON",
    body: "The raw Swagger-compatible specification is available at /api/docs and can be imported into Swagger UI, Swagger Editor, Postman, or any OpenAPI tooling.",
  },
  {
    title: "Polling",
    body: "Chat polling currently happens every 5 seconds in the web app, and call signaling also uses polling. Mobile clients can follow the same pattern with /api/chat/messages and /api/call/poll.",
  },
] as const;

export const apiReference = [
  {
    method: "POST",
    path: "/api/chat/join",
    tag: "Chat",
    summary: "Create a chat session and join the room",
    requestExample: {
      name: "Anand",
    },
    responseExample: {
      ok: true,
      user: {
        id: "8dc69971-7db6-49de-a96f-9a40f9d1626a",
        name: "Anand",
      },
    },
  },
  {
    method: "GET",
    path: "/api/chat/messages",
    tag: "Chat",
    summary: "Fetch messages, current user, and user presence",
    responseExample: {
      messages: [
        {
          id: "message-1",
          name: "Anand",
          text: "Hello from mobile",
          timestamp: "2026-04-05T10:10:00.000Z",
          type: "message",
          userId: "8dc69971-7db6-49de-a96f-9a40f9d1626a",
        },
      ],
      user: {
        id: "8dc69971-7db6-49de-a96f-9a40f9d1626a",
        name: "Anand",
      },
      users: [
        {
          name: "Anand",
          online: true,
        },
      ],
    },
  },
  {
    method: "POST",
    path: "/api/chat/send",
    tag: "Chat",
    summary: "Send a text message",
    requestExample: {
      message: "Hello from React Native",
    },
    responseExample: {
      ok: true,
    },
  },
  {
    method: "POST",
    path: "/api/call/request",
    tag: "Calls",
    summary: "Create an audio or video call invite",
    requestExample: {
      mode: "audio",
    },
    responseExample: {
      ok: true,
      callId: "2f2b90d9-1206-4356-aa79-c507683f1a52",
      mode: "audio",
    },
  },
  {
    method: "POST",
    path: "/api/call/join",
    tag: "Calls",
    summary: "Join a pending call",
    requestExample: {
      callId: "2f2b90d9-1206-4356-aa79-c507683f1a52",
    },
    responseExample: {
      ok: true,
      state: {
        callId: "2f2b90d9-1206-4356-aa79-c507683f1a52",
        callMode: "audio",
        createdAt: "2026-04-05T10:10:00.000Z",
        creatorId: "creator-1",
        creatorName: "Anand",
        participantId: "participant-1",
        participantName: "Ravi",
        status: "active",
      },
    },
  },
  {
    method: "GET",
    path: "/api/call/poll?callId={callId}",
    tag: "Calls",
    summary: "Poll WebRTC signals and call state",
    responseExample: {
      signals: [
        {
          callId: "2f2b90d9-1206-4356-aa79-c507683f1a52",
          fromUserId: "creator-1",
          signalType: "offer",
          payload: {
            type: "offer",
            sdp: "v=0...",
          },
        },
      ],
      state: {
        callId: "2f2b90d9-1206-4356-aa79-c507683f1a52",
        callMode: "audio",
        createdAt: "2026-04-05T10:10:00.000Z",
        creatorId: "creator-1",
        creatorName: "Anand",
        participantId: "participant-1",
        participantName: "Ravi",
        status: "active",
      },
    },
  },
  {
    method: "POST",
    path: "/api/call/signal",
    tag: "Calls",
    summary: "Queue a WebRTC signaling payload",
    requestExample: {
      callId: "2f2b90d9-1206-4356-aa79-c507683f1a52",
      targetUserId: "participant-1",
      signalType: "offer",
      payload: {
        type: "offer",
        sdp: "v=0...",
      },
    },
    responseExample: {
      ok: true,
    },
  },
  {
    method: "POST",
    path: "/api/profile/delete",
    tag: "Profile",
    summary: "Delete the current user and their messages",
    responseExample: {
      ok: true,
    },
  },
  {
    method: "POST",
    path: "/api/admin/auth",
    tag: "Admin",
    summary: "Create an admin session",
    requestExample: {
      password: "passwordpasswordpassword1234password",
    },
    responseExample: {
      ok: true,
    },
  },
  {
    method: "DELETE",
    path: "/api/admin/auth",
    tag: "Admin",
    summary: "Clear the admin session",
    responseExample: {
      ok: true,
    },
  },
  {
    method: "POST",
    path: "/api/admin/flush",
    tag: "Admin",
    summary: "Flush the full Redis database",
    responseExample: {
      ok: true,
    },
  },
  {
    method: "DELETE",
    path: "/api/admin/users",
    tag: "Admin",
    summary: "Delete a user and all of their related messages",
    requestExample: {
      name: "Anand",
    },
    responseExample: {
      ok: true,
    },
  },
] as const;

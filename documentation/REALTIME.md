# Real-time Features

This document describes the real-time features of the application.

## Socket.IO

Socket.IO is a library that enables real-time, bidirectional and event-based communication between web clients and servers. It plays a crucial role in several aspects of our application:

### Signaling
Socket.IO is used for WebRTC signaling. When a user initiates a video or audio call, Socket.IO facilitates the exchange of session control messages (like SDP and ICE candidates) between the peers. This allows them to establish a direct peer-to-peer connection.

### Presence
The application uses Socket.IO to track user online status. When a user connects, a "user_online" event is emitted, and when they disconnect, a "user_offline" event is emitted. This allows the application to display a list of currently online users.

### Chat
Real-time chat functionality is built using Socket.IO. When a user sends a message, it's emitted to the server via a Socket.IO event, which then broadcasts the message to the appropriate recipient(s) or room.

### Authentication
Authentication for Socket.IO connections is handled via a token-based mechanism. When a client attempts to connect, it must provide a valid JSON Web Token (JWT) that was issued upon successful login. The server verifies this token before establishing the connection. If the token is invalid or expired, the connection is refused.

### Rate Limiting
To prevent abuse and ensure service stability, rate limiting is applied to Socket.IO events. Users who exceed a certain number of events within a given time window may be temporarily disconnected or have their messages throttled. The specific limits are configured on the server-side.

### Ephemeral Messages
Socket.IO supports ephemeral messages, which are messages that are not persisted in the database. These are useful for transient notifications or indicators, such as "user is typing" notifications in the chat interface. These messages are broadcast to relevant clients but are not stored long-term.

### Media Upload Process
While Socket.IO itself is not typically used for transferring large binary files, it plays a role in coordinating media uploads.
1.  **Request Upload URL:** The client makes a request to the HTTP server (not via Socket.IO) to get a pre-signed URL for uploading a file to a cloud storage service (e.g., AWS S3, Google Cloud Storage).
2.  **File Upload:** The client uploads the file directly to the cloud storage provider using the pre-signed URL.
3.  **Notify via Socket.IO:** Once the upload is complete, the client sends a Socket.IO message to the server containing metadata about the uploaded file (e.g., file URL, type, size).
4.  **Broadcast Message:** The server then broadcasts this information to other relevant clients (e.g., users in a chat room), allowing them to access the newly uploaded media.

This approach offloads the heavy lifting of file transfer to dedicated storage services, keeping the Socket.IO server responsive for real-time messaging.

## WebRTC (Web Real-Time Communication)

WebRTC is a technology that enables peer-to-peer communication directly between web browsers and mobile applications for real-time audio, video, and data sharing.

### Audio/Video Calls
The primary role of WebRTC in our application is to facilitate direct, low-latency audio and video calls between users. Once a signaling process (often managed by Socket.IO, as described above) has established the connection parameters, WebRTC handles the streaming of audio and video data directly between the peers. This peer-to-peer nature minimizes server load and reduces latency.

### STUN/TURN Servers
To establish WebRTC connections, clients need to discover their public IP addresses and ports, especially if they are behind Network Address Translators (NATs) or firewalls.
*   **STUN (Session Traversal Utilities for NAT)** servers are used to help clients discover their public IP address and the type of NAT they are behind. In many cases, this is sufficient to establish a peer-to-peer connection.
*   **TURN (Traversal Using Relays around NAT)** servers are used as a fallback when a direct peer-to-peer connection cannot be established (e.g., due to symmetric NATs or restrictive firewalls). TURN servers relay the media streams between peers, which adds latency and server load but ensures connectivity. Our application is configured with addresses for both STUN and TURN servers.

### Media Quality Adaptation
WebRTC includes mechanisms for adapting media quality to changing network conditions. It can dynamically adjust video resolution, frame rate, and audio bitrate to provide the best possible experience without overwhelming the available bandwidth. This helps maintain call stability even on less reliable networks.

### Media Streams and Permissions
1.  **Requesting Permissions:** Before initiating or joining a call, the application must request permission from the user to access their microphone and camera using the browser's `navigator.mediaDevices.getUserMedia()` API. The user is prompted by their browser to allow or deny access.
2.  **Local MediaStream:** If permission is granted, the application obtains a local `MediaStream` object containing audio and/or video tracks from the user's devices.
3.  **Adding Tracks to PeerConnection:** These local tracks are then added to the `RTCPeerConnection` object, which makes them available to the remote peer once the connection is established.
4.  **Receiving Remote Streams:** Similarly, when the remote peer adds their tracks, our application receives a remote `MediaStream` through an event on the `RTCPeerConnection`. This stream can then be attached to an HTML `<audio>` or `<video>` element to be played in the user interface.
5.  **Ending Streams:** When a call ends, or if a user revokes permissions, the tracks are stopped, and the `MediaStream` is cleaned up to release the camera and microphone.

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

## Operational Flow: Socket.IO and WebRTC

While Socket.IO handles signaling and WebRTC manages the direct media stream, their interaction is crucial for establishing and managing real-time audio/video calls. Here's a breakdown of the operational flow:

### 1. Call Initiation

*   **User A (Caller) initiates a call:**
    *   The caller's client application requests access to the camera and microphone.
    *   Upon granting permission, a local `MediaStream` is created.
    *   The client sends a `call:start` Socket.IO event to the server, typically including the `callee_id`.
*   **Server relays the call request:**
    *   The server receives `call:start` and identifies User B (Callee).
    *   It emits a `call:incoming` Socket.IO event to User B, including the `caller_id`.

### 2. Call Connection (Signaling via Socket.IO, Media via WebRTC)

This phase involves a negotiation process using SDP (Session Description Protocol) objects and ICE (Interactive Connectivity Establishment) candidates, all relayed via Socket.IO.

*   **User B (Callee) accepts the call:**
    *   The callee's client application receives `call:incoming`.
    *   If User B accepts, their client requests camera/microphone access and creates a local `MediaStream`.
    *   A new `RTCPeerConnection` object is created by both User A and User B. The local `MediaStream` tracks are added to this connection.
*   **WebRTC Offer (Caller to Callee):**
    *   User A's `RTCPeerConnection` generates an SDP **offer**. This offer contains information about User A's media capabilities and proposed connection parameters.
    *   User A's client sends this offer to User B via the server using a `webrtc:offer` Socket.IO event (e.g., `socket.emit('webrtc:offer', { to: callee_id, offer: sdpOffer })`).
    *   **Key WebRTC State:** `RTCPeerConnection.signalingState` on User A's side becomes `'have-local-offer'`.
*   **WebRTC Answer (Callee to Caller):**
    *   User B's client receives the `webrtc:offer` event.
    *   The offer is set as the remote description on User B's `RTCPeerConnection` (`setRemoteDescription(sdpOffer)`).
    *   **Key WebRTC State:** `RTCPeerConnection.signalingState` on User B's side becomes `'have-remote-offer'`.
    *   User B's `RTCPeerConnection` generates an SDP **answer**.
    *   User B's client sends this answer back to User A via the server using a `webrtc:answer` Socket.IO event (e.g., `socket.emit('webrtc:answer', { to: caller_id, answer: sdpAnswer })`).
    *   User A's client receives the `webrtc:answer` and sets it as the remote description (`setRemoteDescription(sdpAnswer)`).
    *   **Key WebRTC State:** `RTCPeerConnection.signalingState` on User A's side becomes `'stable'` (or `'have-remote-pranswer'` if it's a provisional answer, then `'stable'`). On User B's side, after generating the answer and before it's fully accepted by A, it might be `'have-local-pranswer'` or similar, eventually becoming `'stable'`.
*   **ICE Candidate Exchange (Parallel Process):**
    *   As soon as `setLocalDescription` (part of creating offer/answer) is called on an `RTCPeerConnection`, the WebRTC layer starts gathering ICE candidates. These candidates are potential network paths (IP address and port combinations) that peers can use to connect.
    *   When an ICE candidate is generated by User A's `RTCPeerConnection` (listening to the `onicecandidate` event), User A's client sends it to User B via a `webrtc:ice-candidate` Socket.IO event (e.g., `socket.emit('webrtc:ice-candidate', { to: callee_id, candidate: iceCandidate })`).
    *   User B's client receives the `webrtc:ice-candidate` event and adds the candidate to its `RTCPeerConnection` (`addIceCandidate(iceCandidate)`).
    *   The same process happens in reverse: User B sends its ICE candidates to User A.
    *   **Key WebRTC State:** `RTCPeerConnection.iceConnectionState` transitions through states like `'new'`, `'checking'`, `'connected'`, or `'completed'` as candidates are exchanged and a viable path is found. If a TURN server is used, it might go to `'relayed'`. If it fails, it could be `'failed'`.
*   **Media Stream Established:**
    *   Once ICE negotiation is successful and SDP offer/answer is complete, a direct peer-to-peer WebRTC connection is established.
    *   The `ontrack` event fires on each `RTCPeerConnection` when media from the other peer arrives. The application can then attach the remote media stream to an HTML `<video>` or `<audio>` element.
    *   **Key WebRTC State:** `RTCPeerConnection.connectionState` becomes `'connected'`.

### 3. Data Transfer

*   With the WebRTC connection established, audio and video data are streamed directly between User A and User B. Socket.IO is no longer involved in the media transfer itself.
*   WebRTC handles encryption (DTLS-SRTP) and manages bandwidth adaptation.

### 4. Call Termination

*   **User hangs up:**
    *   Either user can initiate call termination (e.g., User A clicks "end call").
    *   The client sends a `call:end` Socket.IO event to the server, which relays it to the other user.
    *   The local `RTCPeerConnection` is closed (`peerConnection.close()`). This stops media tracks and releases resources.
    *   Local media streams (camera/microphone access) are stopped (`localStream.getTracks().forEach(track => track.stop())`).
*   **Other user receives termination signal:**
    *   The other user's client receives the `call:end` event.
    *   Their `RTCPeerConnection` is also closed.
    *   Local media streams are stopped.
*   **Key WebRTC States upon closing:**
    *   `RTCPeerConnection.signalingState` becomes `'closed'`.
    *   `RTCPeerConnection.iceConnectionState` becomes `'closed'`.
    *   `RTCPeerConnection.connectionState` becomes `'closed'`.

### Key Socket.IO Events:

*   `call:start`: Initiates a call from caller to callee.
*   `call:incoming`: Notifies callee of an incoming call.
*   `call:accepted`: (Optional, can be implicit) Callee accepts the call.
*   `call:rejected`: (Optional) Callee rejects the call.
*   `webrtc:offer`: Transports the SDP offer from caller to callee.
*   `webrtc:answer`: Transports the SDP answer from callee to caller.
*   `webrtc:ice-candidate`: Transports ICE candidates between peers.
*   `call:end`: Signals the termination of the call.

### Key WebRTC `RTCPeerConnection` States:

*   **`signalingState`**: Tracks the state of the SDP offer/answer exchange (`'stable'`, `'have-local-offer'`, `'have-remote-offer'`, `'closed'`).
*   **`iceConnectionState`**: Tracks the state of ICE candidate gathering and connectivity (`'new'`, `'checking'`, `'connected'`, `'completed'`, `'failed'`, `'disconnected'`, `'closed'`).
*   **`connectionState`**: Represents the overall state of the peer connection, combining ICE and DTLS transport states (`'new'`, `'connecting'`, `'connected'`, `'failed'`, `'disconnected'`, `'closed'`).
*   **`iceGatheringState`**: Indicates if ICE candidate gathering is ongoing (`'new'`, `'gathering'`, `'complete'`).

### Sequence Diagram: WebRTC Call Flow

```mermaid
sequenceDiagram
    participant ClientA as Client A (Caller)
    participant SIO_Server as Socket.IO Server
    participant ClientB as Client B (Callee)

    Note over ClientA, ClientB: User grants media permissions
    ClientA->>SIO_Server: call:start (to: CalleeID)
    SIO_Server->>ClientB: call:incoming (from: CallerID)

    Note over ClientB: User accepts call
    ClientB-->>ClientA: (User B creates PeerConnection)
    ClientA-->>ClientB: (User A creates PeerConnection)

    Note over ClientA: Create SDP Offer
    ClientA->>SIO_Server: webrtc:offer (SDP Offer)
    SIO_Server->>ClientB: webrtc:offer (SDP Offer)

    Note over ClientB: Receive Offer, Create SDP Answer
    ClientB->>SIO_Server: webrtc:answer (SDP Answer)
    SIO_Server->>ClientA: webrtc:answer (SDP Answer)

    Note over ClientA, ClientB: ICE Candidate Exchange (parallel)
    loop ICE Exchange
        ClientA->>SIO_Server: webrtc:ice-candidate (Candidate from A)
        SIO_Server->>ClientB: webrtc:ice-candidate (Candidate from A)
        ClientB->>SIO_Server: webrtc:ice-candidate (Candidate from B)
        SIO_Server->>ClientA: webrtc:ice-candidate (Candidate from B)
    end

    Note over ClientA, ClientB: WebRTC Connection Establishes
    ClientA->>ClientB: Direct Media Stream (Audio/Video via WebRTC)
    ClientB->>ClientA: Direct Media Stream (Audio/Video via WebRTC)

    Note over ClientA, SIO_Server, ClientB: Call Termination (Example: Client A hangs up)
    ClientA->>SIO_Server: call:end
    SIO_Server->>ClientB: call:end
    Note over ClientA: Close PeerConnection, Stop Media
    Note over ClientB: Close PeerConnection, Stop Media
```

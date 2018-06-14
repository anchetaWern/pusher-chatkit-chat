# React Native Pusher ChatKit sample one-to-one chat app

## Prerequisites

-   Expo Client for [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) or [iOS](https://itunes.apple.com/us/app/expo-client/id982107779).
-   Genymotion emulator for Android, or iOS simulator for iOS.

## How to run

Clone the repo:

```
git clone https://github.com/anchetaWern/pusher-chatkit-chat.git
```

`cd` into the cloned repo and install all the dependencies:

```
cd pusher-chatkit-chat
npm install
```

Update lines 9 and 10 of `App.js` file with your Pusher ChatKit credentials. You can find the instance locator ID on your ChatKit dashboard. While the general room ID can be created from the instance inspector. Just create a new user then create a room. The ID assigned to that room will be the general room ID:

```
const instanceLocatorId = 'YOUR INSTANCE LOCATOR ID';
const presenceRoomId = 'YOUR GENERAL ROOM ID';  
```

Update line 11 with the internal IP address assigned by your router to your computer. This way, the emulator can have access to the server:

```
const chatServer = 'http://YOUR_INTERNAL_IP_ADDRESS:3000/users';
```

Starting inside root directory of the project (`ChatApp`), `cd` into the `server` directory and install all the dependencies:

```
cd server
npm install
```

While it's installing, update lines 7 to 9 of the `server.js` file with your Pusher ChatKit credentials:

```
const instance_locator_id = 'YOUR INSTANCE LOCATOR ID';
const chatkit_secret = 'YOUR PUSHER CHATKIT SECRET';
```

Run the server once it's done installing:

```
node server.js
```

Launch a Genymotion emulator device instance or connect your iOS or Android device.

If you want to run the app on the Genymotion emulator and iOS simulator only, you can execute the following commands. Be sure to run the second command only after the packager has done installing and launching the app on the first emulator instance to avoid clashing:

```
react-native run-android
react-native run-ios
```

If you want to run on your iOS or Android device, use the `exp start` command instead. Then use `exp send` to send the Expo app link to your email. You can then open the link in your email and it will launch the Expo app with the ChatKit sample app opened:

```
exp start
exp send -s YOUR-EMAIL
```

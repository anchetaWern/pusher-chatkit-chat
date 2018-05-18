import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChatManager, TokenProvider } from '@pusher/chatkit';

import Login from './app/screens/Login';
import Users from './app/screens/Users';
import Chat from './app/screens/Chat';

/*
how to make the demo work:
- replace instance_locator_ id with the chatkit instance locator (exclude the v1:us1: prefix)
- create two users you want to use for testing via the chatkit inspector
- create a room via the chatkit inspector and add its name (general_room_ name) and id (general_room_ id)
*/

const instanceLocatorId = '54a480d4-3b3c-44ce-bd15-6584ec83cc80';
const presenceRoomId = 6925472; // room ID of the general room created through the chatKit inspector
const presenceRoomName = 'rakshasha';

const tokenProvider = new TokenProvider({
  url: `https://us1.pusherplatform.io/services/chatkit_token_provider/v1/${instanceLocatorId}/token`
});

//d

export default class App extends React.Component {

  state = {
    currentScreen: 'login',
    username: null,
    users: [],
    presenceRoomId: null,
    currentRoomId: null,
    chatWithUser: null,
    message: '',
    messages: [],
    chatWithUserIsTyping: false,
    refreshing: false
  }
    

  constructor(props) {
    super(props);
    this.currentUser = null; 
    this.roomId = null;
    this.chatWithUser = null;
  }


  render() {
    return (
      <View style={styles.container}>
        {
          this.state.currentScreen == 'login' &&
          <Login username={this.state.username} updateUsername={this.updateUsername} enterChat={this.enterChat} />
        }

        {
          this.state.currentScreen == 'users' &&
          <Users users={this.sortUsers(this.state.users)} beginChat={this.beginChat} leavePresenceRoom={this.leavePresenceRoom} />
        }

        {
          this.state.currentScreen == 'chat' &&
          <Chat 
            message={this.state.message}
            backToUsers={this.backToUsers} 
            updateMessage={this.updateMessage}
            sendMessage={this.sendMessage} 
            chatWithUser={this.state.chatWithUser} 
            chatWithUserIsTyping={this.state.chatWithUserIsTyping}
            messages={this.state.messages}
            refreshing={this.state.refreshing}
            loadPreviousMessages={this.loadPreviousMessages}
            setScrollViewRef={this.setScrollViewRef} />
        }
      </View>
    );
  }

  
  updateUsername = (username) => {
    this.setState({
      username
    });
  }


  enterChat = () => {

    fetch('http://192.168.254.104:3000/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: this.state.username
      }),
    })
    .then((response) => {

      this.chatManager = new ChatManager({
        instanceLocator: `v1:us1:${instanceLocatorId}`,
        /*
        note: 
        not sure if there's an error handler for chatManager but this will
        certainly fail if user does not exist yet.
        is there a way to check if user already exists from the JS client?
        */
        userId: this.state.username, 
        tokenProvider
      });

      this.chatManager.connect()
        .then((currentUser) => {

          this.currentUser = currentUser;

          /*
          note: 
          user has to leave the room so they could find it in the joinable rooms
          we can probably remove this one if we could just ensure the user will click on the "leave" button.
          it's hard to remember to do that while testing, that's why I have this piece of code
          */
          this.currentUser.leaveRoom({ roomId: presenceRoomId }) 
            .then((room) => {
              
              this.currentUser.getJoinableRooms()
                .then((rooms) => {
                  
                  var presenceRoom = rooms.find((item) => {
                    return item.name == presenceRoomName; // the name given to the general room
                  });
                  
                  if(presenceRoom){
                    this.setState({
                      presenceRoomId: presenceRoom.id
                    });
                    
                    currentUser.subscribeToRoom({ 
                      roomId: presenceRoom.id,
                      hooks: {
                        
                        onUserCameOnline: this.handleInUser,
                        onUserJoinedRoom: this.handleInUser,
                            
                        onUserLeftRoom: this.handleOutUser,
                        onUserWentOffline: this.handleOutUser
                      },
                    })
                    .then((room) => {
                     
                      let new_users = [];
                      room.users.forEach((user) => {
                        if(user.id != this.currentUser.id){
                          let is_online = user.presence.state == 'online' ? true : false;

                          new_users.push({
                            id: user.id,
                            name: user.name,
                            is_online
                          });
                        }
                      });

                      this.setState({
                        users: new_users
                      });

                    })
                    .catch((err) => {
                      console.log(`Error joining room ${err}`);
                    });   
                               
                  }
                  
                });

            })
            .catch((error) => {
              console.log('error while trying to leave the room');
            });

        })
        .catch((error) => {
          console.log('error with chat manager', error);
        });

    })
    .catch((error) => {
      console.error('error in request: ', error)
    });

    this.setState({
      currentScreen: 'users'
    });
  }


  handleInUser = (user) => {
    /*
    note:
    user has to already exist before logging in.
    I created two users that I used for testing (through the chatkit inspector): jacob and rem
    this is to simplify things so I don't have to create a Node server that will create the users.
    */

    let currentUsers = [...this.state.users];
    let userIndex = currentUsers.findIndex((item) => item.id == user.id); 
    
    if(userIndex != - 1){
      currentUsers[userIndex]['is_online'] = true;
    }
    
    if(user.id != this.currentUser.id && userIndex == -1){ 

      currentUsers.push({
        id: user.id,
        name: user.name,
        is_online: true
      });

    }

    this.setState({
      users: currentUsers
    });

  }


  sortUsers = (users) => {
    return users.slice().sort((x, y) => {
      return y.is_online - x.is_online;
    });
  }


  handleOutUser = (user) => {
           
    let users = [...this.state.users];
    let new_users = users.filter((item) => {
      if(item.id == user.id){
        item.is_online = false;
      }
      return item;
    });

    this.setState({
      users: new_users
    });

  }


  backToUsers = () => {
    this.currentUser.leaveRoom({ roomId: this.roomId })
      .then((room) => {
        this.setState({
          currentScreen: 'users',
          messages: []
        }); 
      });  
  }


  beginChat = (user) => {

    let roomName = [user.id, this.currentUser.id];
    roomName = roomName.sort().join('_') + '_room';
  
    this.currentUser.getJoinableRooms()
      .then((rooms) => {
        
        var chat_room = rooms.find((room) => { 
          return room.name == roomName;
        });

        if(!chat_room){
          this.currentUser.createRoom({
            name: roomName,
            private: false, // so they could find it in joinable rooms
          })
          .then((room) => {
            this.subscribeToRoom(room.id, user.id);
          })
          .catch((err) => {
            console.log(`error creating room ${err}`);
          });

        }else{
          this.subscribeToRoom(chat_room.id, user.id);
        }

      })
      .catch((err) => {
        console.log(`error getting joinable rooms: ${err}`);
      });

  }


  subscribeToRoom = (roomId, chatWith) => {
    
    this.roomId = roomId;
    this.chatWithUser = chatWith;

    this.currentUser.subscribeToRoom({
      roomId: roomId,
      hooks: {
        onNewMessage: this.onReceiveMessage,

        onUserStartedTyping: this.onUserTypes,
        onUserStoppedTyping: this.onUserNotTypes
      },
      messageLimit: 5
    })
    .then((room) => {
      console.log(`successfully subscribed to room`);
    })
    .catch((err) => {
      console.log(`error subscribing to room: ${err}`);
    });

    this.setState({
      currentScreen: 'chat',
      currentRoomId: roomId,
      chatWithUser: chatWith
    });

  }


  onReceiveMessage = (message) => {
      
      let isCurrentUser = (this.currentUser.id == message.sender.id) ? true : false;

      let messages = [...this.state.messages];
      messages.push({
        key: message.id.toString(),
        username: message.sender.name,
        msg: message.text,
        datetime: message.createdAt,
        isCurrentUser
      });

      this.setState({
        messages
      }, () => {
        this.scrollViewRef.scrollToEnd({animated: true}); 
      });
    
  }


  onUserTypes = (user) => {
    this.setState({
      chatWithUserIsTyping: true
    });
  }


  onUserNotTypes = (user) => {
    this.setState({
      chatWithUserIsTyping: false
    });
  }


  leavePresenceRoom = () => {
    this.currentUser.leaveRoom({ roomId: this.state.presenceRoomId })
      .then((room) => {
          this.setState({
            presenceRoomId: null,
            currentScreen: 'login'
          });
      })
      .catch((err) => {
        console.log(`error leaving presence room ${this.state.presenceRoomId}: ${err}`)
      });
  }


  updateMessage = (message) => {
    this.setState({
      message
    });

    this.currentUser.isTypingIn({ roomId: this.state.currentRoomId });
  }


  sendMessage = () => {
    if(this.state.message){

      this.currentUser.sendMessage({
        text: this.state.message,
        roomId: this.state.currentRoomId
      })
      .then((messageId) => {
       
        this.setState({
          message: ''
        });

      })
      .catch((err) => {
        console.log(`error adding message to room: ${err}`);
      });

    }
  }


  loadPreviousMessages = () => {
    const oldestMessageId = Math.min(...this.state.messages.map(m => parseInt(m.key)));
   
    this.setState({
      refreshing: false
    });

    this.currentUser.fetchMessages({
      roomId: this.state.currentRoomId,
      initialId: oldestMessageId, 
      direction: 'older',
      limit: 5
    })
    .then((messages) => {
     
      let currentMessages = [...this.state.messages];
      let old_messages = [];

      messages.forEach((msg) => {

        let isCurrentUser = (this.currentUser.id == msg.sender.id) ? true : false;

        old_messages.push({
          key: msg.id.toString(),
          username: msg.sender.name,
          msg: msg.text,
          datetime: msg.createdAt,
          isCurrentUser
        })
      });

      currentMessages = old_messages.concat(currentMessages); 
      
      this.setState({
        refreshing: false,
        messages: currentMessages
      });

    });
    
  }


  setScrollViewRef = (ref) => {
    this.scrollViewRef = ref;
  }


}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { ChatManager, TokenProvider } from '@pusher/chatkit';

import Login from './app/screens/Login';
import Users from './app/screens/Users';
import Chat from './app/screens/Chat';

/*
how to make the demo work:
- replace instance_locator_id with the chatkit instance locator (exclude the v1:us1: prefix)
- create two users you want to use for testing via the chatkit inspector
- create a room via the chatkit inspector and add its name (general_room_name) and id (general_room_id)
*/

const instance_locator_id = '54a480d4-3b3c-44ce-bd15-6584ec83cc80';
const general_room_id = 6925472; // room ID of the general room created through the chatKit inspector
const general_room_name = 'rakshasha';

const tokenProvider = new TokenProvider({
  url: `https://us1.pusherplatform.io/services/chatkit_token_provider/v1/${instance_locator_id}/token`
});

export default class App extends React.Component {

  state = {
    current_page: 'login',
    username: null,
    users: [],
    general_room_id: null,
    current_room_id: null,
    chat_with_user: null,
    message: '',
    messages: [],
    chat_with_user_is_typing: false,
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
          this.state.current_page == 'login' &&
          <Login username={this.state.username} updateUsername={this.updateUsername} enterChat={this.enterChat} />
        }

        {
          this.state.current_page == 'users' &&
          <Users users={this.sortUsers(this.state.users)} beginChat={this.beginChat} leaveGeneralRoom={this.leaveGeneralRoom} />
        }

        {
          this.state.current_page == 'chat' &&
          <Chat 
            message={this.state.message}
            backToUsers={this.backToUsers} 
            updateMessage={this.updateMessage}
            sendMessage={this.sendMessage} 
            chatWithUser={this.state.chat_with_user} 
            chatWithUserIsTyping={this.state.chat_with_user_is_typing}
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

    this.chatManager = new ChatManager({
      instanceLocator: 'v1:us1:54a480d4-3b3c-44ce-bd15-6584ec83cc80',
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
        this.currentUser.leaveRoom({ roomId: general_room_id }) 
          .then((room) => {
            
            this.currentUser.getJoinableRooms()
              .then((rooms) => {
                
                var general_room = rooms.find((item) => {
                  return item.name == general_room_name; // the name given to the general room
                });
                
                if(general_room){
                  this.setState({
                    general_room_id: general_room.id
                  });
                  
                  currentUser.subscribeToRoom({ 
                    roomId: general_room.id,
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

    this.setState({
      current_page: 'users'
    });
  }


  handleInUser = (user) => {
    /*
    note:
    user has to already exist before logging in.
    I created two users that I used for testing (through the chatkit inspector): jacob and rem
    this is to simplify things so I don't have to create a Node server that will create the users.
    */

    let current_users = [...this.state.users];
    let user_index = current_users.findIndex((item) => item.id == user.id); 
    
    if(user_index != - 1){
      current_users[user_index]['is_online'] = true;
    }
    
    if(user.id != this.currentUser.id && user_index == -1){ 

      current_users.push({
        id: user.id,
        name: user.name,
        is_online: true
      });

    }

    this.setState({
      users: current_users
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
          current_page: 'users',
          messages: []
        }); 
      });  
  }


  beginChat = (user) => {

    let room_name = [user.id, this.currentUser.id];
    room_name = room_name.sort().join('_') + '_room';
  
    this.currentUser.getJoinableRooms()
      .then((rooms) => {
        
        var chat_room = rooms.find((room) => { 
          return room.name == room_name;
        });

        if(!chat_room){
          this.currentUser.createRoom({
            name: room_name,
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


  subscribeToRoom = (room_id, chat_with) => {
    
    this.roomId = room_id;
    this.chatWithUser = chat_with;

    this.currentUser.subscribeToRoom({
      roomId: room_id,
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
      current_page: 'chat',
      current_room_id: room_id,
      chat_with_user: chat_with
    });

  }


  onReceiveMessage = (message) => {
      
      let is_current_user = (this.currentUser.id == message.sender.id) ? true : false;

      let messages = [...this.state.messages];
      messages.push({
        key: message.id.toString(),
        username: message.sender.name,
        msg: message.text,
        datetime: message.createdAt,
        is_current_user
      });

      this.setState({
        messages
      }, () => {
        this.scrollViewRef.scrollToEnd({animated: true}); 
      });
    
  }


  onUserTypes = (user) => {
    this.setState({
      chat_with_user_is_typing: true
    });
  }


  onUserNotTypes = (user) => {
    this.setState({
      chat_with_user_is_typing: false
    });
  }


  leaveGeneralRoom = () => {
    this.currentUser.leaveRoom({ roomId: this.state.general_room_id })
      .then((room) => {
          this.setState({
            general_room_id: null,
            current_page: 'login'
          });
      })
      .catch((err) => {
        console.log(`error leaving general room ${this.state.general_room_id}: ${err}`)
      });
  }


  updateMessage = (message) => {
    this.setState({
      message
    });

    this.currentUser.isTypingIn({ roomId: this.state.current_room_id });
  }


  sendMessage = () => {
    this.currentUser.sendMessage({
      text: this.state.message,
      roomId: this.state.current_room_id
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


  loadPreviousMessages = () => {
    const oldest_message_id = Math.min(...this.state.messages.map(m => parseInt(m.key)));
   
    this.setState({
      refreshing: false
    });

    this.currentUser.fetchMessages({
      roomId: this.state.current_room_id,
      initialId: oldest_message_id, 
      direction: 'older',
      limit: 5
    })
    .then((messages) => {
     
      let current_messages = [...this.state.messages];
      let old_messages = [];

      messages.forEach((msg) => {

        let is_current_user = (this.currentUser.id == msg.sender.id) ? true : false;

        old_messages.push({
          key: msg.id.toString(),
          username: msg.sender.name,
          msg: msg.text,
          datetime: msg.createdAt,
          is_current_user
        })
      });

      current_messages = old_messages.concat(current_messages); 
      
      this.setState({
        refreshing: false,
        messages: current_messages
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

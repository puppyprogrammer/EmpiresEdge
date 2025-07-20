import React from 'react';

const OnlinePlayersPage = () => {
  const onlineUsers = [
    'Player1',
    'Player2',
    'Player3',
    'Player4',
  ];

  return (
    <div>
      <h3>Online Players</h3>
      <ul>
        {onlineUsers.map((user, index) => (
          <li key={index}>{user}</li>
        ))}
      </ul>
    </div>
  );
};

export default OnlinePlayersPage;
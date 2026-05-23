function verifyuser(socket,next){
    const info=socket.handshake
    console.log(socket.role);
    next();
}

module.exports={
    verifyuser
} 
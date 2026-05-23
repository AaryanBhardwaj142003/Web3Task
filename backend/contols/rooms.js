class Room{

    constructor(roomId){

        this.roomId=roomId;
        this.admin=null;

        this.users=[];

        this.video={
            videoId:"dQw4w9WgXcQ",
            isPlaying:false,
            time:0
        };

    }

    addUser(user, lastSocketId){
        let existingUser = null;
        if (lastSocketId) {
            existingUser = this.users.find(u => u.id === lastSocketId);
        }

        if (existingUser) {
            existingUser.id = user.id;
            existingUser.role = user.role;
            existingUser.username = user.username;
            if (this.admin === lastSocketId) {
                this.admin = user.id;
            }
        } else {
            this.users.push(user);
        }
    }

    getAllUsers(){

        return this.users;

    }

    getUser(userId){

        return this.users.find(
            (user)=>
            user.id===userId
        );

    }

    setadmin(userId){
        this.admin=userId
    }

    getadmin(){
        return this.users.find((user)=>
            user.id===this.admin
        );
    }

    removeUser(userId){

        this.users=
        this.users.filter(
            (user)=>
            user.id!==userId
        );

    }

    changeRole(
        userId,
        role
    ){

        const user=
        this.getUser(
            userId
        );

        if(user){
            user.role=role;
        }

    }

    setVideo(videoId){

        this.video={
            videoId,
            isPlaying:false,
            time:0
        };

    }

    playVideo(){

        this.video.isPlaying=true;

    }

    pauseVideo(){

        this.video.isPlaying=false;

    }

    seekVideo(time){

        this.video.time=time;

    }

}

module.exports={Room};
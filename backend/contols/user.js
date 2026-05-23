class User {
   constructor(id, role, username){
      this.id=id;
      this.role=role;
      this.username=username || `User_${id.substring(0, 5)}`;
   }
}

module.exports={User}
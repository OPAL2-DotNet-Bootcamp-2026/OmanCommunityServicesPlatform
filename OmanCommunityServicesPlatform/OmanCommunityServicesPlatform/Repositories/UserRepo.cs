using OmanCommunityServicesPlatform.Models;

namespace OmanCommunityServicesPlatform.Repositories
{
    public class UserRepo
    {
        private OCSPContext context;
        
        public UserRepo (OCSPContext _context)
        {
            context = _context;
        }

        public void Add(User user)
        {
            context.Users.Add(user);
            context.SaveChanges();
        }

        public void Update()
        {
            context.SaveChanges();
        }

        public User GetById(int id)
        {
            return context.Users.FirstOrDefault(u => u.userId == id);
        }


    }
}

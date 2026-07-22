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

        // Needed for Registration
        public void Add(User user)
        {
            context.Users.Add(user);
            context.SaveChanges();
        }

        // Needed for Admin's user management screen
        public List<User> GetAll()
        {
            return context.Users.ToList();
        }

        // 	Needed for profile views, and internally by Service for almost every other operation
        public User GetById(int id)
        {
            return context.Users.FirstOrDefault(u => u.userId == id);
        }

        // Needed for login lookups and for checking duplicate registrations
        public User GetByEmail(string email)
        {
            return context.Users.FirstOrDefault(u => u.email ==email);
        }

        // Needed so Staff dashboards or Admin can see who's in a department
        public List<User> GetByDepartment(int departmentId)
        {
            return context.Users.Where(u => u.departmentId == departmentId).ToList();
        }

        public void Update()
        {
            context.SaveChanges();
        }

        public bool EmailExists(string email)
        {
            return context.Users.Any(u => u.email == email);
        }
    }
}

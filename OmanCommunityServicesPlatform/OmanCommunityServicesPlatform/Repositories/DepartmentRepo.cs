using OmanCommunityServicesPlatform.Models;

namespace OmanCommunityServicesPlatform.Repositories
{
    public class DepartmentRepo
    {
        private OCSPContext context;
        public DepartmentRepo(OCSPContext _context)
        {
            context = _context;
        }
        public List<Department> GetAllDepartments()
        {
            return context.Departments.ToList();
        }
        public Department GetDepartmentById(int id)
        {
            return context.Departments.FirstOrDefault(d => d.departmentId == id);
        }
        public void Add(Department department)
        {
            context.Departments.Add(department);
            context.SaveChanges();
        }
        public void Update()
        {
            context.SaveChanges();
        }

    }
}

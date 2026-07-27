using Microsoft.EntityFrameworkCore;
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
            return context.Departments.Include(d => d.Categories).Include(d => d.Issues).Include(d => d.Users).ToList();
        }
        public Department GetDepartmentById(int id)
        {
            return context.Departments.Include(d => d.Categories).Include(d => d.Issues).Include(d => d.Users).Include(d => d.region).FirstOrDefault(d => d.departmentId == id);
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
        public void Delete(Department department)
        {
            context.Departments.Remove(department);
            context.SaveChanges();
        }
        // Check if department name already exists
        public bool IsDepartmentNameExist(string name)
        {
            return context.Departments.Any(d => d.departmentName == name);
        }

    }
}

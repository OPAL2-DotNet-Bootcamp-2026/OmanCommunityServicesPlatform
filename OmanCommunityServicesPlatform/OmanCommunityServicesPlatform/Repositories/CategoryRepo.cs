using Microsoft.EntityFrameworkCore;
using OmanCommunityServicesPlatform.Models;

namespace OmanCommunityServicesPlatform.Repositories
{
    public class CategoryRepo
    {
        private  OCSPContext context;
        public CategoryRepo(OCSPContext context)
        {
            this.context = context;
        }
        // Get all categories
        public List<Category> GetAllCategories()
        {
            return context.Categories.Include(c => c.department).Include(c => c.Issues).ToList();
        }
        //Get Category by id 
        public Category? GetCategoryById(int id)
        {
            return context.Categories.Include(c => c.department).Include(c => c.Issues).FirstOrDefault(c => c.categoryId == id);

        }
        //Add new category 
        public void Add(Category category) 
        { 
            context.Categories.Add(category);
            context.SaveChanges();
        }
        //Update category
        public void Update()
        {
            context.SaveChanges();
        }
        //Delete category 
        public void Delete(Category category)
        {
            context.Categories.Remove(category);
            context.SaveChanges();
        }
        // Check if category name already exists
        public bool IsCategoryNameExist(string name)
        {
            return context.Categories.Any(c => c.categoryName == name);
        }
    }
}

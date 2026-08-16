using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class RegionService
    {
        private RegionRepo regionRepo;
        private readonly ILogger<RegionService> logger;

        public RegionService(RegionRepo _regionRepo, ILogger<RegionService> _logger)
        {
            regionRepo = _regionRepo;
            logger = _logger;
        }
        // Create Region
        public RegionResponseDto? Create(CreateRegionDto dto)
        {
            // Prevent duplicate names — regionName has a unique index in the DB
            Region? existing = regionRepo.GetByName(dto.regionName);
            if (existing != null)
            {
                logger.LogWarning("Region with name {regionName} already exists", dto.regionName);
                return null;
            }

            Region region = new Region();

            region.regionName = dto.regionName;
            region.governorate = dto.governorate;

            regionRepo.Add(region);
            logger.LogInformation("Region with ID {regionId} created", region.regionId);
            
            RegionResponseDto response = new RegionResponseDto();
            response.regionId = region.regionId;
            response.regionName = region.regionName;
            response.governorate = region.governorate;
            return response;

        }
        // Get All Regions
        public List<RegionResponseDto> GetAll()
        {
            List<Region> regions = regionRepo.GetAll();
            List<RegionResponseDto> response = new List<RegionResponseDto>();

            foreach (Region region in regions)
            {
                RegionResponseDto dto = new RegionResponseDto();
                dto.regionId = region.regionId;
                dto.regionName = region.regionName;
                dto.governorate = region.governorate;
                response.Add(dto);
            }
            return response;
        }
        // Get Region By Id
        public RegionResponseDto? GetById(int id)
        {
            Region? region = regionRepo.GetById(id);
            if (region == null)
                return null;

            RegionResponseDto response = new RegionResponseDto();
            response.regionId = region.regionId;
            response.regionName = region.regionName;
            response.governorate = region.governorate;

            return response;
        }
        // Update Region
        public RegionResponseDto? Update(int id, UpdateRegionDto dto)
        {
            Region? region = regionRepo.GetById(id);
            if (region == null)
            {
                logger.LogWarning("Region with ID {regionId} not found", id);
                return null;
            }

            // If the name is changing, make sure the new name isn't taken
            if (region.regionName != dto.regionName)
            {
                Region? existingRegion = regionRepo.GetByName(dto.regionName);
                if (existingRegion != null)
                {
                    logger.LogWarning("Region with name {regionName} already exists", dto.regionName);
                    return null;
                }
            }
            region.regionName = dto.regionName;
            region.governorate = dto.governorate;

            regionRepo.Update();
            logger.LogInformation("Region with ID {regionId} updated", region.regionId);

            RegionResponseDto response = new RegionResponseDto();
            response.regionId = region.regionId;
            response.regionName = region.regionName;
            response.governorate = region.governorate;

            return response;

        }
        // Delete Region
        public bool Delete(int id)
        {
            Region? region = regionRepo.GetById(id);
            if (region == null)
            {
                logger.LogWarning("Region with ID {regionId} not found", id);
                return false;
            }

            regionRepo.Delete(region);
            logger.LogInformation("Region with ID {regionId} deleted", region.regionId);
            return true;
        }
    }
}

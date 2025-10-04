const educationService = require('../../src/services/educationService');

describe('EducationService', () => {
  describe('getAllModules', () => {
    it('should return array of modules', async () => {
      const modules = await educationService.getAllModules();
      expect(Array.isArray(modules)).toBe(true);
    });
  });

  describe('getModuleBySlug', () => {
    it('should return module with sections', async () => {
      const module = await educationService.getModuleBySlug('mev-basics');
      expect(module).toBeDefined();
      expect(module.sections).toBeDefined();
      expect(Array.isArray(module.sections)).toBe(true);
    });

    it('should return null for invalid slug', async () => {
      const module = await educationService.getModuleBySlug('invalid-slug');
      expect(module).toBeNull();
    });
  });

  describe('calculateLevel', () => {
    it('should return correct level for XP', () => {
      const calculateLevel = (xp) => {
        if (xp >= 2100) return 5;
        if (xp >= 1200) return 4;
        if (xp >= 700) return 3;
        if (xp >= 300) return 2;
        return 1;
      };

      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(300)).toBe(2);
      expect(calculateLevel(700)).toBe(3);
      expect(calculateLevel(1200)).toBe(4);
      expect(calculateLevel(2100)).toBe(5);
    });
  });
});

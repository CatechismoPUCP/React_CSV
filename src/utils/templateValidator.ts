export const validateTemplate = (templateFile: File): Promise<string[]> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const issues: string[] = [];
        
        // Check for required placeholders
        const requiredPlaceholders = [
          '{{day}}', '{{month}}', '{{year}}',
          '{{orarioLezione}}', '{{argomento}}',
          '{{nome1}}', '{{nome2}}', '{{nome3}}', '{{nome4}}', '{{nome5}}',
          '{{MattOraIn1}}', '{{MattOraOut1}}',
          '{{PomeOraIn1}}', '{{PomeOraOut1}}',
          '{{presenza1}}'
        ];
        
        requiredPlaceholders.forEach(placeholder => {
          if (!content.includes(placeholder)) {
            issues.push(`Placeholder mancante: ${placeholder}`);
          }
        });
        
        // Check for malformed placeholders
        const malformedRegex = /\{\{[^}]*\}\}/g;
        const matches = content.match(malformedRegex) || [];
        
        matches.forEach(match => {
          if (!requiredPlaceholders.includes(match) && 
              !match.match(/\{\{(nome|MattOraIn|MattOraOut|PomeOraIn|PomeOraOut|presenza)[1-5]\}\}/)) {
            issues.push(`Placeholder sconosciuto: ${match}`);
          }
        });
        
        resolve(issues);
      } catch (error) {
        resolve(['Errore durante la lettura del template']);
      }
    };
    
    reader.onerror = () => {
      resolve(['Errore durante la lettura del file template']);
    };
    
    reader.readAsText(templateFile);
  });
};

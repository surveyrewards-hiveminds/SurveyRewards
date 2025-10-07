import { useState, useCallback } from 'react';
import type { Survey } from '../types';

export function useTagFilter(surveys: Survey[]) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleTagClick = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev : [...prev, tag]
    );
  }, []);

  const handleTagRemove = useCallback((tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  }, []);

  const filteredSurveys = surveys.filter(survey => 
    selectedTags.length === 0 || selectedTags.every(tag => survey.tags.includes(tag))
  );

  return {
    selectedTags,
    handleTagClick,
    handleTagRemove,
    filteredSurveys
  };
}
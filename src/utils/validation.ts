export function validateAge(birthDate: string): boolean {
  if (!birthDate) return false;
  
  const today = new Date();
  const birth = new Date(birthDate);
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age >= 12;
}

export function getMaxBirthDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 12);
  return date.toISOString().split('T')[0];
}
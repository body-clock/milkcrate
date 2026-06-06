export interface LoginErrors {
  email?: string[];
  password?: string[];
}

export interface LoginPageProps {
  errors?: LoginErrors;
  notice?: string;
  alert?: string;
  allow_dev_login?: boolean;
}

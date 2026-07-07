export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

export interface IUser {
  id: string
  username: string
  password: string
  role: UserRole
  created_at: number
  updated_at: number
}

export interface IUserPublic {
  id: string
  username: string
  role: UserRole
  created_at: number
  updated_at: number
}

export const toUserPublic = (user: IUser): IUserPublic => {
  const { password: _password, ...rest } = user
  void _password
  return rest
}

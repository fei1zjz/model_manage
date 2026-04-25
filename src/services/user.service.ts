import bcrypt from "bcryptjs";
import { userRepository } from "../repositories/user.repository";

const SALT_ROUNDS = 10;

export class UserService {
  async register(data: { email: string; username: string; password: string }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new Error("Email already registered");
    }
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    return userRepository.create({
      email: data.email,
      username: data.username,
      passwordHash,
    });
  }

  async login(data: { email: string; password: string }) {
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      throw new Error("Invalid email or password");
    }
    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid email or password");
    }
    return {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role as "admin" | "user" | "viewer",
    };
  }

  async getProfile(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateProfile(id: string, data: { email?: string; username?: string }) {
    if (data.email) {
      const existing = await userRepository.findByEmail(data.email);
      if (existing && existing.id !== id) {
        throw new Error("Email already in use");
      }
    }
    return userRepository.update(id, data);
  }

  async changePassword(id: string, oldPassword: string, newPassword: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("User not found");
    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) throw new Error("Current password is incorrect");
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    return userRepository.updatePassword(id, passwordHash);
  }

  async listUsers() {
    return userRepository.findAll();
  }

  async updateRole(id: string, role: "admin" | "user" | "viewer") {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("User not found");
    return userRepository.updateRole(id, role);
  }

  async deleteUser(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("User not found");
    return userRepository.delete(id);
  }
}

export const userService = new UserService();

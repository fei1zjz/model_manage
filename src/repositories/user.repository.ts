import prisma from "../db/prisma";

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findAll() {
    return prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  }

  async create(data: {
    email: string;
    username: string;
    passwordHash: string;
    role?: "admin" | "user" | "viewer";
  }) {
    return prisma.user.create({ data });
  }

  async update(id: string, data: { email?: string; username?: string }) {
    return prisma.user.update({ where: { id }, data });
  }

  async updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async updateRole(id: string, role: "admin" | "user" | "viewer") {
    return prisma.user.update({ where: { id }, data: { role } });
  }

  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }
}

export const userRepository = new UserRepository();

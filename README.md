# Legacy - Collaborative Family Tree Builder

Legacy is a modern, collaborative web application designed to help you build, visualize, and preserve your family history. With an intuitive interface and powerful features, you can create detailed family trees, document life stories, and share your heritage with loved ones.

## Features

- **Interactive Family Tree**: Visualize your ancestry with a dynamic, easy-to-navigate graph based on React Flow.
- **Collaborative Editing**: Invite family members to join your tree and contribute their knowledge.
- **Detailed Profiles**: Store rich information for every family member, including birth/death dates, locations, and personal notes.
- **Smart Layouts**: Automatically organizes your family tree into a clear, readable generation-based structure.
- **Secure & Private**: Built with Clerk authentication to ensure your family data remains private and secure.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Visualization**: [React Flow](https://reactflow.dev/)
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Authentication**: [Clerk](https://clerk.com/)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Lucide Icons, Sonner

## Getting Started

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd family-tree
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Set up environment variables**:
    Create a `.env` file in the root directory and add the following keys:
    ```env
    DATABASE_URL="postgresql://..."
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
    CLERK_SECRET_KEY="sk_test_..."
    ```

4.  **Run database migrations**:
    ```bash
    npx prisma generate
    npx prisma db push
    ```

5.  **Start the development server**:
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to start building your legacy.

## License

This project is private.

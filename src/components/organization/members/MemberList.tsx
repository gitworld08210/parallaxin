// MemberList — UI scaffold. Compose real markup as the feature ships.
import MemberCard from "./MemberCard";

const members = [
  {
    id: "1",
    name: "Rahul Sharma",
    email: "rahul@aurelix.com",
    role: "Owner",
    department: "Engineering",
    online: true,
  },
  {
    id: "2",
    name: "Ananya Singh",
    email: "ananya@aurelix.com",
    role: "Manager",
    department: "Marketing",
    online: true,
  },
  {
    id: "3",
    name: "Aman Gupta",
    email: "aman@aurelix.com",
    role: "Member",
    department: "Engineering",
    online: false,
  },
  {
    id: "4",
    name: "Priya Verma",
    email: "priya@aurelix.com",
    role: "Admin",
    department: "Human Resources",
    online: true,
  },
];

export const MemberList = () => {
  if (members.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h3 className="text-xl font-semibold text-slate-900">No Members Found</h3>

        <p className="mt-2 text-slate-500">Invite your first team member to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {members.map((member) => (
        <MemberCard
          key={member.id}
          id={member.id}
          name={member.name}
          email={member.email}
          role={member.role}
          department={member.department}
          online={member.online}
        />
      ))}
    </div>
  );
};

export default MemberList;

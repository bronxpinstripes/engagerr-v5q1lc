import React, { useState, useEffect } from 'react';
import { MoreHorizontal, UserPlus, Mail } from 'lucide-react'; // lucide-react ^0.279.0
import { useQuery, useMutation, useQueryClient } from 'react-query'; // react-query ^5.0.0
import { useForm } from 'react-hook-form'; // react-hook-form ^7.45.0
import { zodResolver } from '@hookform/resolvers/zod'; // @hookform/resolvers/zod ^3.1.0
import { z } from 'zod'; // zod ^3.22.0

import DashboardLayout from '../../../components/layout/DashboardLayout';
import PageHeader from '../../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';
import {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from '../../../components/ui/Modal';
import Form from '../../../components/forms/Form';
import FormField from '../../../components/forms/FormField';
import FormItem from '../../../components/forms/FormItem';
import FormLabel from '../../../components/forms/FormLabel';
import FormControl from '../../../components/forms/FormControl';
import FormMessage from '../../../components/forms/FormMessage';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Badge from '../../../components/ui/Badge';
import Avatar from '../../../components/ui/Avatar';
import Alert from '../../../components/ui/Alert';
import Checkbox from '../../../components/ui/Checkbox';
import useBrand from '../../../hooks/useBrand';
import useToast from '../../../hooks/useToast';
import { api } from '../../../lib/api';
import {
  TeamMember,
  TeamRole,
  TeamInvite,
  InviteStatus,
  Permission,
} from '../../../types/user';
import { teamInviteSchema } from '../../../lib/validators';

// Define the shape of the form data for inviting team members
interface InviteFormData {
  email: string;
  role: TeamRole;
}

// Define the shape of the data for updating a team member's role
interface UpdateMemberData {
  role: TeamRole;
  permissions: Permission[];
}

/**
 * Server component that renders the brand team settings page
 */
const TeamPage: React.FC = () => {
  // Get brand data and ID using the useBrand hook
  const { brandId, brand } = useBrand();

  // Fetch team members and invites using React Query
  const { data: teamMembers, isLoading: teamMembersLoading, error: teamMembersError } = useQuery(
    ['teamMembers', brandId],
    () => fetchTeamMembers(brandId as string),
    { enabled: !!brandId }
  );

  const { data: teamInvites, isLoading: teamInvitesLoading, error: teamInvitesError } = useQuery(
    ['teamInvites', brandId],
    () => fetchTeamInvites(brandId as string),
    { enabled: !!brandId }
  );

  // Set up form handling for team invitations using React Hook Form
  const { register, handleSubmit, formState: { errors }, reset } = useForm<InviteFormData>({
    resolver: zodResolver(teamInviteSchema),
    defaultValues: {
      email: '',
      role: TeamRole.MEMBER,
    },
  });

  // Initialize toast notifications system
  const toast = useToast();

  // Implement functions for sending invites, removing members, and updating permissions
  const queryClient = useQueryClient();

  const sendInviteMutation = useMutation(sendInvite, {
    onSuccess: () => {
      toast.success('Invitation sent successfully!');
      queryClient.invalidateQueries(['teamInvites', brandId]);
      reset();
    },
    onError: (error: any) => {
      toast.error('Failed to send invitation', error.message);
    },
  });

  const cancelInviteMutation = useMutation(cancelInvite, {
    onSuccess: () => {
      toast.success('Invitation cancelled successfully!');
      queryClient.invalidateQueries(['teamInvites', brandId]);
    },
    onError: (error: any) => {
      toast.error('Failed to cancel invitation', error.message);
    },
  });

  const updateMemberRoleMutation = useMutation(updateMemberRole, {
    onSuccess: () => {
      toast.success('Member role updated successfully!');
      queryClient.invalidateQueries(['teamMembers', brandId]);
    },
    onError: (error: any) => {
      toast.error('Failed to update member role', error.message);
    },
  });

  const removeMemberMutation = useMutation(removeMember, {
    onSuccess: () => {
      toast.success('Member removed successfully!');
      queryClient.invalidateQueries(['teamMembers', brandId]);
    },
    onError: (error: any) => {
      toast.error('Failed to remove member', error.message);
    },
  });

  // Render page header and description
  return (
    <DashboardLayout>
      <PageHeader
        title="Team Management"
        description="Manage your team members and their permissions."
      />

      {/* Render card with team members table showing name, email, role, status, and actions */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {teamMembersLoading ? (
            <Alert>Loading team members...</Alert>
          ) : teamMembersError ? (
            <Alert variant="error">{teamMembersError.message}</Alert>
          ) : teamMembers && teamMembers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar name={member.user.fullName} src={member.user.avatar} />
                        <span>{member.user.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{member.user.email}</TableCell>
                    <TableCell>{renderRoleBadge(member.role)}</TableCell>
                    <TableCell>Active</TableCell>
                    <TableCell>
                      <Modal>
                        <ModalTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </ModalTrigger>
                        <ModalContent>
                          <ModalHeader>
                            <ModalTitle>Edit Member Permissions</ModalTitle>
                            <ModalDescription>
                              Change the role and permissions for {member.user.fullName}.
                            </ModalDescription>
                          </ModalHeader>
                          {/* Implement modal for editing team member permissions */}
                          <ModalFooter>
                            <Button variant="secondary">Cancel</Button>
                            <Button>Save Changes</Button>
                          </ModalFooter>
                        </ModalContent>
                      </Modal>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Alert>No team members found.</Alert>
          )}
        </CardContent>
      </Card>

      {/* Render card with pending invitations table showing email, role, status, and actions */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {teamInvitesLoading ? (
            <Alert>Loading pending invitations...</Alert>
          ) : teamInvitesError ? (
            <Alert variant="error">{teamInvitesError.message}</Alert>
          ) : teamInvites && teamInvites.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>{renderRoleBadge(invite.role)}</TableCell>
                    <TableCell>{invite.status}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => cancelInviteMutation.mutate(invite.id)}>
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Alert>No pending invitations found.</Alert>
          )}
        </CardContent>
      </Card>

      {/* Implement modal for sending new team invitations with email and role fields */}
      <Modal>
        <ModalTrigger asChild>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Team Member
          </Button>
        </ModalTrigger>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Invite Team Member</ModalTitle>
            <ModalDescription>
              Send an invitation to a new team member to join your brand.
            </ModalDescription>
          </ModalHeader>
          <Form {...{ register, handleSubmit, errors }}>
            <FormField
              control={null}
              name="email"
              label="Email"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="team@example.com" type="email" {...register("email")} />
                  </FormControl>
                  <FormMessage>{errors.email?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={null}
              name="role"
              label="Role"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Select {...register("role")}>
                      <option value={TeamRole.ADMIN}>Admin</option>
                      <option value={TeamRole.MEMBER}>Member</option>
                      <option value={TeamRole.VIEWER}>Viewer</option>
                    </Select>
                  </FormControl>
                  <FormMessage>{errors.role?.message}</FormMessage>
                </FormItem>
              )}
            />
            <ModalFooter>
              <Button variant="secondary">Cancel</Button>
              <Button type="submit">Send Invitation</Button>
            </ModalFooter>
          </Form>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
};

export default TeamPage;

/**
 * Fetches the current team members for the brand
 */
async function fetchTeamMembers(brandId: string): Promise<TeamMember[]> {
  try {
    const response = await api.get<TeamMember[]>(`/api/brands/${brandId}/team`);
    return response;
  } catch (error) {
    console.error('Failed to fetch team members:', error);
    return [];
  }
}

/**
 * Fetches pending team invitations for the brand
 */
async function fetchTeamInvites(brandId: string): Promise<TeamInvite[]> {
  try {
    const response = await api.get<TeamInvite[]>(`/api/brands/${brandId}/invites`);
    return response;
  } catch (error) {
    console.error('Failed to fetch team invites:', error);
    return [];
  }
}

/**
 * Sends a team invitation to the specified email with a role
 */
async function sendInvite(formData: InviteFormData): Promise<void> {
  const { email, role } = formData;
  // TODO: Implement API call to send invitation
  console.log(`Sending invite to ${email} with role ${role}`);
}

/**
 * Cancels a pending team invitation
 */
async function cancelInvite(inviteId: string): Promise<void> {
  // TODO: Implement API call to cancel invitation
  console.log(`Cancelling invite with ID ${inviteId}`);
}

/**
 * Updates the role and permissions of a team member
 */
async function updateMemberRole(memberId: string, data: UpdateMemberData): Promise<void> {
  // TODO: Implement API call to update member role
  console.log(`Updating member ${memberId} with role ${data.role} and permissions ${data.permissions}`);
}

/**
 * Removes a team member from the brand
 */
async function removeMember(memberId: string): Promise<void> {
  // TODO: Implement API call to remove team member
  console.log(`Removing member with ID ${memberId}`);
}

/**
 * Renders a badge with appropriate styling for different team roles
 */
function renderRoleBadge(role: TeamRole): JSX.Element {
  let badgeVariant = 'secondary';
  switch (role) {
    case TeamRole.OWNER:
      badgeVariant = 'primary';
      break;
    case TeamRole.ADMIN:
      badgeVariant = 'secondary';
      break;
    case TeamRole.MEMBER:
      badgeVariant = 'outline';
      break;
    case TeamRole.VIEWER:
      badgeVariant = 'ghost';
      break;
    default:
      badgeVariant = 'secondary';
  }
  return <Badge variant={badgeVariant}>{role}</Badge>;
}
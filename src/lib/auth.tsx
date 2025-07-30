"use client"
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import React from "react";

export function withAuth(Component: any) {
  return function AuthenticatedComponent(props: any) {
    const router = useRouter();
    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          router.replace("/login");
        }
      });
    }, [router]);
    return <Component {...props} />;
  };
}

// Function to handle user data after Google OAuth
export async function handleUserAfterAuth() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      return;
    }

    console.log('User authenticated:', user);
    console.log('User metadata:', user.user_metadata);
    console.log('User email:', user.email);

    // Check if user profile exists in our users table
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    const email = user.email;
    let name =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      (email ? email.split('@')[0] : 'Unknown');
    console.log('Extracted name:', name);

    if (fetchError && fetchError.code === 'PGRST116') {
      // User doesn't exist in our table, create profile
      const insertData = {
        id: user.id,
        email,
        name,
        role: 'follower',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      console.log('Inserting user:', insertData);
      const { error: insertError } = await supabase
        .from('users')
        .insert(insertData);

      if (insertError) {
        console.error('Failed to create user profile:', insertError);
      } else {
        console.log('User profile created successfully');
      }
    } else if (existingUser) {
      // If user exists but name is null, update it
      if (!existingUser.name) {
        console.log('Updating user name for existing user:', { id: user.id, name });
        const { error: updateError } = await supabase
          .from('users')
          .update({ name })
          .eq('id', user.id);
        if (updateError) {
          console.error('Failed to update user name:', updateError);
        } else {
          console.log('User name updated successfully');
        }
      } else {
        console.log('User profile already exists:', existingUser);
      }
    }
    return user;
  } catch (error) {
    console.error('Error handling user after auth:', error);
  }
} 
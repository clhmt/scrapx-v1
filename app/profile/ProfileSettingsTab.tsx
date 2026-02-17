"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface ProfileRow {
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
}

interface ProfilePrivateRow {
    phone: string | null;
}

interface ProfileSettingsForm {
    firstName: string;
    lastName: string;
    companyName: string;
    phone: string;
}

interface ProfileSettingsTabProps {
    userId: string;
    onProfileUpdated: (profile: { first_name: string; last_name: string; company_name: string }) => void;
}

const PHONE_MAX_LENGTH = 32;

export default function ProfileSettingsTab({ userId, onProfileUpdated }: ProfileSettingsTabProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [initialValues, setInitialValues] = useState<ProfileSettingsForm | null>(null);
    const [formState, setFormState] = useState<ProfileSettingsForm>({
        firstName: "",
        lastName: "",
        companyName: "",
        phone: "",
    });

    useEffect(() => {
        const loadProfileSettings = async () => {
            setLoading(true);
            setErrorMessage(null);

            const [{ data: profileData, error: profileError }, { data: privateData, error: privateError }] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("first_name, last_name, company_name")
                    .eq("user_id", userId)
                    .maybeSingle<ProfileRow>(),
                supabase
                    .from("profile_private")
                    .select("phone")
                    .eq("user_id", userId)
                    .maybeSingle<ProfilePrivateRow>(),
            ]);

            if (profileError || privateError) {
                const message = profileError?.message || privateError?.message || "Failed to load profile settings.";
                setErrorMessage(message);
                setLoading(false);
                return;
            }

            const nextState: ProfileSettingsForm = {
                firstName: profileData?.first_name?.trim() || "",
                lastName: profileData?.last_name?.trim() || "",
                companyName: profileData?.company_name?.trim() || "",
                phone: privateData?.phone?.trim() || "",
            };

            setFormState(nextState);
            setInitialValues(nextState);
            setLoading(false);
        };

        loadProfileSettings();
    }, [userId]);

    const trimmedForm = useMemo(
        () => ({
            firstName: formState.firstName.trim(),
            lastName: formState.lastName.trim(),
            companyName: formState.companyName.trim(),
            phone: formState.phone.trim(),
        }),
        [formState]
    );

    const hasChanges = useMemo(() => {
        if (!initialValues) return false;

        return (
            trimmedForm.firstName !== initialValues.firstName ||
            trimmedForm.lastName !== initialValues.lastName ||
            trimmedForm.companyName !== initialValues.companyName ||
            trimmedForm.phone !== initialValues.phone
        );
    }, [initialValues, trimmedForm]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage(null);

        if (trimmedForm.phone.length > PHONE_MAX_LENGTH) {
            setErrorMessage(`Phone number must be ${PHONE_MAX_LENGTH} characters or fewer.`);
            return;
        }

        if (!hasChanges) {
            alert("No changes to save.");
            return;
        }

        setSaving(true);

        const { error } = await supabase.rpc("update_my_profile", {
            first_name: trimmedForm.firstName,
            last_name: trimmedForm.lastName,
            company_name: trimmedForm.companyName,
            phone: trimmedForm.phone,
        });

        setSaving(false);

        if (error) {
            setErrorMessage(error.message || "Failed to save profile settings.");
            alert(`Error saving profile settings: ${error.message}`);
            return;
        }

        setFormState(trimmedForm);
        setInitialValues(trimmedForm);
        onProfileUpdated({
            first_name: trimmedForm.firstName,
            last_name: trimmedForm.lastName,
            company_name: trimmedForm.companyName,
        });
        alert("Profile settings saved successfully!");
    };

    if (loading) {
        return <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-300 text-center"><p className="text-gray-400 font-bold italic">Loading profile settings...</p></div>;
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">First Name</label>
                        <input
                            type="text"
                            value={formState.firstName}
                            onChange={(event) => setFormState((prev) => ({ ...prev, firstName: event.target.value }))}
                            className="w-full p-3 border border-gray-300 rounded-lg"
                            placeholder="First Name"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Last Name</label>
                        <input
                            type="text"
                            value={formState.lastName}
                            onChange={(event) => setFormState((prev) => ({ ...prev, lastName: event.target.value }))}
                            className="w-full p-3 border border-gray-300 rounded-lg"
                            placeholder="Last Name"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Company Name</label>
                        <input
                            type="text"
                            value={formState.companyName}
                            onChange={(event) => setFormState((prev) => ({ ...prev, companyName: event.target.value }))}
                            className="w-full p-3 border border-gray-300 rounded-lg"
                            placeholder="Company Name"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                        <input
                            type="text"
                            value={formState.phone}
                            onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value.slice(0, PHONE_MAX_LENGTH) }))}
                            className="w-full p-3 border border-gray-300 rounded-lg"
                            placeholder="Phone Number"
                            maxLength={PHONE_MAX_LENGTH}
                        />
                    </div>
                </div>

                {errorMessage && <p className="text-sm font-bold text-red-600">{errorMessage}</p>}

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving || !hasChanges}
                        className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold text-xs hover:bg-green-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? "Saving..." : "Save Profile Settings"}
                    </button>
                </div>
            </form>
        </div>
    );
}

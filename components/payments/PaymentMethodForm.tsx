"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { CreditCard, X } from "lucide-react";
import {
	getWithImpersonation,
	postWithImpersonation,
	putWithImpersonation,
} from "@/lib/api-client";
import { error } from "console";

// Declare Accept.js types
declare global {
	interface Window {
		Accept: {
			dispatchData: (
				secureData: any,
				responseHandler: (response: any) => void,
			) => void;
		};
	}
}

interface PaymentMethodFormProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	onError: (message: string) => void;
	userType?: "employer" | "seeker";
	paymentMethodId?: string; // If provided, we're updating an existing payment method
	onPaymentMethodAdded?: () => void; // New callback for when payment method is added
	mode?: "add" | "update";
}

export function PaymentMethodForm({
	isOpen,
	onClose,
	onSuccess,
	onError,
	userType = "employer",
	paymentMethodId,
	mode = "add",
	onPaymentMethodAdded,
}: PaymentMethodFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isAcceptJsLoaded, setIsAcceptJsLoaded] = useState(false);
	const [isSandbox, setIsSandbox] = useState(false);
	const [formData, setFormData] = useState({
		cardNumber: "",
		expiryMonth: "",
		expiryYear: "",
		cvv: "",
		cardName: "",
		isDefault: false,
		_config: null as any,
	});
	const [billingInfo, setBillingInfo] = useState({
		firstName: "",
		lastName: "",
		address: "",
		city: "",
		state: "",
		zipCode: "",
	});

	// Load Accept.js script and configuration
	useEffect(() => {
		if (isOpen && !isAcceptJsLoaded) {
			const initializeAcceptJs = async () => {
				try {
					// Get Authorize.net configuration from API
					const configResponse = await getWithImpersonation(
						"/api/payments/authnet/config",
					);
					if (!configResponse.ok) {
						throw new Error("Failed to get payment configuration");
					}

					const { config } = await configResponse.json();

					console.log("🔍 PAYMENT METHOD: Configuration loaded:", {
						hasApiLoginId: !!config.apiLoginId,
						hasClientKey: !!config.clientKey,
						environment: config.environment,
					});

					setIsSandbox(config.environment !== "production");

					// Load Accept.js based on environment from config
					const acceptJsUrl =
						config.environment === "production"
							? "https://js.authorize.net/v1/Accept.js"
							: "https://jstest.authorize.net/v1/Accept.js";

					const script = document.createElement("script");
					script.src = acceptJsUrl;
					script.charset = "utf-8";
					script.onload = () => {
						console.log(
							"✅ PAYMENT METHOD: Accept.js loaded successfully from:",
							acceptJsUrl,
						);
						setIsAcceptJsLoaded(true);
					};
					script.onerror = () => {
						console.error(
							"❌ PAYMENT METHOD: Failed to load Accept.js from:",
							acceptJsUrl,
						);
						onError("Failed to load payment processing library");
					};
					document.head.appendChild(script);

					// Store config for later use
					setFormData((prev) => ({ ...prev, _config: config }));

					return () => {
						// Cleanup script when component unmounts
						const existingScript = document.querySelector(
							`script[src="${acceptJsUrl}"]`,
						);
						if (existingScript) {
							document.head.removeChild(existingScript);
						}
					};
				} catch (err) {
					console.error("❌ PAYMENT METHOD: Initialization failed:", err);
					onError(
						err instanceof Error
							? err.message
							: "Failed to initialize payment form",
					);
				}
			};

			initializeAcceptJs();
		}
	}, [isOpen, isAcceptJsLoaded, onError]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			// Basic validation
			if (
				!formData.cardNumber ||
				!formData.expiryMonth ||
				!formData.expiryYear ||
				!formData.cvv
			) {
				onError("Please fill in all required fields");
				return;
			}

			// Billing address validation
			if (
				!billingInfo.firstName ||
				!billingInfo.lastName ||
				!billingInfo.address ||
				!billingInfo.city ||
				!billingInfo.state ||
				!billingInfo.zipCode
			) {
				onError("Please fill in all billing address fields");
				return;
			}

			// Remove spaces and validate card number
			const cleanCardNumber = formData.cardNumber.replace(/\s/g, "");
			if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
				onError("Please enter a valid card number");
				return;
			}

			if (!isAcceptJsLoaded || !window.Accept) {
				onError("Payment processing library not loaded. Please try again.");
				return;
			}

			if (!formData._config) {
				onError("Payment configuration not loaded. Please try again.");
				return;
			}

			// Prepare secure data for Accept.js
			const secureData = {
				cardData: {
					cardNumber: cleanCardNumber,
					month: formData.expiryMonth.padStart(2, "0"),
					year: formData.expiryYear,
					cardCode: formData.cvv,
				},
				authData: {
					clientKey: formData._config.clientKey,
					apiLoginID: formData._config.apiLoginId,
				},
			};

			console.log("🔍 PAYMENT METHOD: Secure data being sent to Accept.js:", {
				apiLoginID: secureData.authData.apiLoginID,
				clientKey: secureData.authData.clientKey,
				hasCardNumber: !!secureData.cardData.cardNumber,
				environment: formData._config.environment,
			});

			console.log("🔍 PAYMENT METHOD: Tokenizing card data with Accept.js...");

			// Use Accept.js to tokenize the card data
			window.Accept.dispatchData(secureData, async (response: any) => {
				if (response.messages.resultCode === "Error") {
					const errorMessage = response.messages.message
						.map((msg: any) => msg.text)
						.join(", ");
					onError(errorMessage);
					setIsSubmitting(false);
					return;
				}

				// Successfully tokenized - now send to our API
				try {
					const apiEndpoint =
						userType === "seeker"
							? "/api/seeker/subscription/payment-methods"
							: "/api/employer/billing/payment-methods";

					const isUpdating = mode === "update" && paymentMethodId;
					const requestBody = isUpdating
						? {
							paymentMethodId,
							action: "update",
							opaqueDataDescriptor: response.opaqueData.dataDescriptor,
							opaqueDataValue: response.opaqueData.dataValue,
							expiryMonth: parseInt(formData.expiryMonth),
							expiryYear: parseInt(formData.expiryYear),
							billingInfo: {
								firstName: billingInfo.firstName || undefined,
								lastName: billingInfo.lastName || undefined,
								address: billingInfo.address || undefined,
								city: billingInfo.city || undefined,
								state: billingInfo.state || undefined,
								zipCode: billingInfo.zipCode || undefined,
							},
						}
						: {
							opaqueDataDescriptor: response.opaqueData.dataDescriptor,
							opaqueDataValue: response.opaqueData.dataValue,
							isDefault: formData.isDefault,
							expiryMonth: parseInt(formData.expiryMonth),
							expiryYear: parseInt(formData.expiryYear),
							billingInfo: {
								firstName: billingInfo.firstName || undefined,
								lastName: billingInfo.lastName || undefined,
								address: billingInfo.address || undefined,
								city: billingInfo.city || undefined,
								state: billingInfo.state || undefined,
								zipCode: billingInfo.zipCode || undefined,
							},
						};

					const apiResponse = isUpdating
						? await putWithImpersonation(apiEndpoint, requestBody)
						: await postWithImpersonation(apiEndpoint, requestBody);

					const result = await apiResponse.json();

					if (result.success) {
						// Call the new callback if provided
						if (onPaymentMethodAdded) {
							onPaymentMethodAdded();
						}
						onSuccess();
						onClose();
						// Reset form but keep config
						setFormData((prev) => ({
							cardNumber: "",
							expiryMonth: "",
							expiryYear: "",
							cvv: "",
							cardName: "",
							isDefault: false,
							_config: prev._config,
						}));
						setBillingInfo({
							firstName: "",
							lastName: "",
							address: "",
							city: "",
							state: "",
							zipCode: "",
						});
					} else {
						onError(
							result.error ||
							`Failed to ${isUpdating ? "update" : "add"} payment method`,
						);
					}
				} catch (apiError) {
					console.error("API error:", apiError);
					onError("Failed to save payment method");
				} finally {
					setIsSubmitting(false);
				}
			});
		} catch (error) {
			console.error("Error adding payment method:", error);
			onError("Failed to add payment method");
			setIsSubmitting(false);
		}
	};

	const formatCardNumber = (value: string) => {
		// Remove all non-digits
		const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
		// Add spaces every 4 digits
		const matches = v.match(/\d{4,16}/g);
		const match = (matches && matches[0]) || "";
		const parts = [];
		for (let i = 0, len = match.length; i < len; i += 4) {
			parts.push(match.substring(i, i + 4));
		}
		if (parts.length) {
			return parts.join(" ");
		} else {
			return v;
		}
	};

	const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const formatted = formatCardNumber(e.target.value);
		setFormData((prev) => ({ ...prev, cardNumber: formatted }));
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 !mt-0">
			<Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center space-x-2">
								<CreditCard className="h-5 w-5" />
								<span>
									{mode === "update"
										? "Update Payment Method"
										: "Add Payment Method"}
								</span>
							</CardTitle>
							<CardDescription>
								{mode === "update"
									? "Update your payment method with new card details"
									: "Add a new payment method for package purchases"}
							</CardDescription>
						</div>
						<Button variant="ghost" size="sm" onClick={onClose}>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{isSandbox && (
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
							<p className="text-sm text-blue-800">
								<strong>SANDBOX PAYMENT</strong> - Test card number:{" "}
								<code className="bg-blue-100 px-1 rounded">4007000000027</code>
							</p>
						</div>
					)}
					{!isAcceptJsLoaded && (
						<div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
							<p className="text-sm text-gray-600">
								Loading secure payment processing...
							</p>
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<Label htmlFor="cardNumber">Card Number *</Label>
							<Input
								id="cardNumber"
								type="text"
								placeholder="1234 5678 9012 3456"
								value={formData.cardNumber}
								onChange={handleCardNumberChange}
								maxLength={19}
								required
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="expiryMonth">Expiry Month *</Label>
								<Input
									id="expiryMonth"
									type="number"
									placeholder="MM"
									min="1"
									max="12"
									value={formData.expiryMonth}
									onChange={(e) => {
										// Limit to 2 digits and ensure value is between 1-12
										let value = e.target.value.replace(/\D/g, "");
										if (value.length > 2) {
											value = value.slice(0, 2);
										}
										// Convert to number and ensure it's between 1-12
										const numValue = parseInt(value, 10);
										if (!isNaN(numValue) && numValue > 12) {
											value = "12";
										}
										setFormData((prev) => ({
											...prev,
											expiryMonth: value,
										}));
									}}
									required
								/>
							</div>
							<div>
								<Label htmlFor="expiryYear">Expiry Year *</Label>
								<Input
									id="expiryYear"
									type="number"
									placeholder="YYYY"
									min={new Date().getFullYear()}
									max={new Date().getFullYear() + 20}
									value={formData.expiryYear}
									onChange={(e) => {
										// Limit to 4 digits only, allow any 4-digit value
										let value = e.target.value.replace(/\D/g, "");
										if (value.length > 4) {
											value = value.slice(0, 4);
										}

										setFormData((prev) => ({
											...prev,
											expiryYear: value,
										}));
									}}
									required
								/>
							</div>
						</div>

						<div>
							<Label htmlFor="cvv">CVV *</Label>
							<Input
								id="cvv"
								type="text"
								placeholder="123"
								maxLength={4}
								value={formData.cvv}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										cvv: e.target.value.replace(/\D/g, ""),
									}))
								}
								required
							/>
						</div>

						<div>
							<Label htmlFor="cardName">Cardholder Name</Label>
							<Input
								id="cardName"
								type="text"
								placeholder="John Doe"
								value={formData.cardName}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, cardName: e.target.value }))
								}
							/>
						</div>

						{/* Billing Address - stored in DB for email notifications only, not sent to Authnet */}
						<div className="space-y-3 border-t pt-4">
							<h4 className="text-sm font-semibold text-gray-700">Billing Address *</h4>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label htmlFor="billingFirstName">First Name *</Label>
									<Input
										id="billingFirstName"
										type="text"
										placeholder="John"
										required
										value={billingInfo.firstName}
										onChange={(e) =>
											setBillingInfo((prev) => ({
												...prev,
												firstName: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label htmlFor="billingLastName">Last Name *</Label>
									<Input
										id="billingLastName"
										type="text"
										placeholder="Doe"
										required
										value={billingInfo.lastName}
										onChange={(e) =>
											setBillingInfo((prev) => ({
												...prev,
												lastName: e.target.value,
											}))
										}
									/>
								</div>
							</div>

							<div>
								<Label htmlFor="billingAddress">Address *</Label>
								<Input
									id="billingAddress"
									type="text"
									placeholder="123 Main St"
									required
									value={billingInfo.address}
									onChange={(e) =>
										setBillingInfo((prev) => ({
											...prev,
											address: e.target.value,
										}))
									}
								/>
							</div>

							<div className="grid grid-cols-3 gap-3">
								<div>
									<Label htmlFor="billingCity">City *</Label>
									<Input
										id="billingCity"
										type="text"
										placeholder="Dallas"
										required
										value={billingInfo.city}
										onChange={(e) =>
											setBillingInfo((prev) => ({
												...prev,
												city: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<Label htmlFor="billingState">State *</Label>
									<Input
										id="billingState"
										type="text"
										placeholder="TX"
										required
										value={billingInfo.state}
										onChange={(e) =>
											setBillingInfo((prev) => ({
												...prev,
												state: e.target.value,
											}))
										}
										maxLength={2}
									/>
								</div>
								<div>
									<Label htmlFor="billingZipCode">ZIP Code *</Label>
									<Input
										id="billingZipCode"
										type="text"
										placeholder="75001"
										required
										value={billingInfo.zipCode}
										onChange={(e) =>
											setBillingInfo((prev) => ({
												...prev,
												zipCode: e.target.value,
											}))
										}
									/>
								</div>
							</div>
						</div>

						<div className="flex items-center space-x-2">
							<Checkbox
								id="isDefault"
								checked={formData.isDefault}
								onCheckedChange={(checked) =>
									setFormData((prev) => ({ ...prev, isDefault: !!checked }))
								}
							/>
							<Label htmlFor="isDefault">Set as default payment method</Label>
						</div>

						<div className="bg-green-50 border border-green-200 rounded-lg p-3">
							<p className="text-sm text-green-800">
								<strong>Secure Processing:</strong> Card data is tokenized by
								Authorize.net and never stored on our servers.
							</p>
						</div>

						<div className="flex space-x-3">
							<Button
								type="button"
								variant="outline"
								onClick={onClose}
								className="flex-1"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={isSubmitting || !isAcceptJsLoaded}
								className="flex-1"
							>
								{isSubmitting
									? "Processing..."
									: !isAcceptJsLoaded
										? "Loading..."
										: mode === "update"
											? "Update Payment Method"
											: "Add Payment Method"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}

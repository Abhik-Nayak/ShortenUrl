/**
 * Pricing Page
 * Shows different pricing plans available
 */

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { planAPI } from "../services/apiService";
import { FiCheck } from "react-icons/fi";
import toast from "react-hot-toast";

function Pricing() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await planAPI.getPlans();
        setPlans(response.data.plans);
      } catch (err) {
        toast.error("Failed to load pricing plans");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleUpgrade = (planId) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (user?.plan === planId) {
      toast.info("You're already on this plan");
      return;
    }

    // Navigate to checkout or show upgrade modal
    navigate("/dashboard?upgrade=" + planId);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="loading-spinner mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <h1 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h1>
      <p className="text-xl text-gray-600 text-center mb-12">
        Choose the plan that best fits your needs
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`card flex flex-col ${
              plan.id === "pro" ? "ring-2 ring-blue-600 lg:scale-105" : ""
            }`}
          >
            {/* Plan Name */}
            <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>

            {/* Price */}
            <div className="mb-6">
              <span className="text-4xl font-bold">${plan.price}</span>
              <span className="text-gray-600 ml-2">/month</span>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => handleUpgrade(plan.id)}
              className={`btn w-full mb-6 ${
                isAuthenticated && user?.plan === plan.id
                  ? "btn-secondary"
                  : "btn-primary"
              }`}
            >
              {isAuthenticated && user?.plan === plan.id
                ? "Current Plan"
                : plan.price === 0
                ? "Get Started"
                : "Upgrade"}
            </button>

            {/* Features */}
            <ul className="space-y-3 flex-1">
              <li className="flex items-center space-x-3">
                <FiCheck className="text-green-500" />
                <span>{plan.linksPerMonth.toLocaleString()} links/month</span>
              </li>
              <li className="flex items-center space-x-3">
                <FiCheck className="text-green-500" />
                <span>
                  {plan.analyticsRetention === null
                    ? "Unlimited"
                    : plan.analyticsRetention}{" "}
                  days analytics
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <FiCheck className="text-green-500" />
                <span>{plan.customDomain ? "Custom domains" : "Default domain"}</span>
              </li>
              <li className="flex items-center space-x-3">
                <FiCheck className="text-green-500" />
                <span>QR code generation</span>
              </li>
              {plan.id !== "free" && (
                <>
                  <li className="flex items-center space-x-3">
                    <FiCheck className="text-green-500" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <FiCheck className="text-green-500" />
                    <span>API access</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="mt-16 max-w-3xl mx-auto">
        <h3 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h3>

        <div className="space-y-6">
          <details className="card cursor-pointer">
            <summary className="font-semibold text-lg">
              Can I change my plan later?
            </summary>
            <p className="mt-4 text-gray-600">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect
              immediately.
            </p>
          </details>

          <details className="card cursor-pointer">
            <summary className="font-semibold text-lg">
              What happens if I exceed my monthly limit?
            </summary>
            <p className="mt-4 text-gray-600">
              Your account will be limited from creating new links. You can either wait for the
              next month or upgrade to a higher plan.
            </p>
          </details>

          <details className="card cursor-pointer">
            <summary className="font-semibold text-lg">Do you offer refunds?</summary>
            <p className="mt-4 text-gray-600">
              We offer a 30-day money-back guarantee if you're not satisfied with our service.
            </p>
          </details>

          <details className="card cursor-pointer">
            <summary className="font-semibold text-lg">
              Is there an API for developers?
            </summary>
            <p className="mt-4 text-gray-600">
              Yes! Pro and Enterprise plans include API access. Check our documentation for
              details.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}

export default Pricing;
